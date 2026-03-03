import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Otp } from "../models/Otp.js";
import { signToken } from "../utils/jwt.js";
import { registerSchema, loginSchema, resendOtpSchema, verifyOtpSchema } from "./validators.js";
import { generateOtp6, otpExpiresAt } from "../utils/otp.js";
import { sendOtpEmail } from "../utils/mailer.js";

export async function register(req, res, next) {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation error", errors: parsed.error.flatten() });
    }

    const { email, password, studentCardNumber, firstName = "", lastName = "", phone = "" } = parsed.data;

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "Email déjà utilisé" });

    const cardExists = await User.findOne({ studentCardNumber });
    if (cardExists) return res.status(409).json({ message: "Numéro de carte étudiant déjà utilisé" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      passwordHash,
      firstName,
      lastName,
      phone,
      studentCardNumber,
      isVerified: false,
    });

    // Génère et envoie OTP
    const code = generateOtp6();
    const codeHash = await bcrypt.hash(code, 10);

    await Otp.create({
      userId: user._id,
      codeHash,
      expiresAt: otpExpiresAt(),
      attempts: 0,
      consumedAt: null,
    });

    await sendOtpEmail({ to: user.email, code });

    // On ne renvoie PAS de token tant que le compte n'est pas vérifié
    res.status(201).json({
      message: "Compte créé. Un code OTP a été envoyé à votre email.",
      email: user.email,
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyOtp(req, res, next) {
  try {
    const parsed = verifyOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation error", errors: parsed.error.flatten() });
    }

    const { email, code } = parsed.data;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });
    if (user.isVerified) {
      const token = signToken({ sub: user._id.toString(), role: user.role });
      return res.json({
        token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
          studentCardNumber: user.studentCardNumber,
          isVerified: true,
        },
      });
    }

    const otp = await Otp.findOne({
      userId: user._id,
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otp) return res.status(400).json({ message: "Code expiré ou introuvable", code: "OTP_EXPIRED" });

    const maxAttempts = Number(process.env.OTP_MAX_ATTEMPTS || 5);
    if (otp.attempts >= maxAttempts) {
      return res.status(429).json({ message: "Trop de tentatives", code: "OTP_TOO_MANY_ATTEMPTS" });
    }

    const ok = await bcrypt.compare(code, otp.codeHash);
    otp.attempts += 1;
    await otp.save();

    if (!ok) return res.status(400).json({ message: "Code OTP invalide", code: "OTP_INVALID" });

    otp.consumedAt = new Date();
    await otp.save();

    user.isVerified = true;
    await user.save();

    const token = signToken({ sub: user._id.toString(), role: user.role });
    return res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        studentCardNumber: user.studentCardNumber,
        isVerified: true,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function resendOtp(req, res, next) {
  try {
    const parsed = resendOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation error", errors: parsed.error.flatten() });
    }

    const { email } = parsed.data;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });
    if (user.isVerified) return res.json({ message: "Compte déjà vérifié" });

    const cooldownSec = Number(process.env.OTP_RESEND_COOLDOWN_SEC || 60);
    const last = await Otp.findOne({ userId: user._id }).sort({ createdAt: -1 });
    if (last && Date.now() - new Date(last.createdAt).getTime() < cooldownSec * 1000) {
      return res.status(429).json({ message: "Veuillez patienter avant de renvoyer un code", code: "RESEND_COOLDOWN" });
    }

    const code = generateOtp6();
    const codeHash = await bcrypt.hash(code, 10);

    await Otp.create({
      userId: user._id,
      codeHash,
      expiresAt: otpExpiresAt(),
      attempts: 0,
      consumedAt: null,
    });

    await sendOtpEmail({ to: user.email, code });

    return res.json({ message: "Nouveau code envoyé" });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation error", errors: parsed.error.flatten() });
    }

    const { email, password } = parsed.data;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Identifiants invalides" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Identifiants invalides" });

    if (!user.isVerified) {
      return res.status(403).json({ message: "Compte non vérifié. Validez l'OTP.", code: "NOT_VERIFIED" });
    }

    const token = signToken({ sub: user._id.toString(), role: user.role });

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        studentCardNumber: user.studentCardNumber,
        isVerified: user.isVerified,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res) {
  // requireAuth a déjà mis req.user
  res.json({ user: req.user });
}
