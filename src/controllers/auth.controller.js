import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { Otp } from "../models/Otp.js";
import { signToken } from "../utils/jwt.js";
import {
  registerSchema,
  loginSchema,
  resendOtpSchema,
  verifyOtpSchema,
} from "./validators.js";
import { generateOtp6, otpExpiresAt } from "../utils/otp.js";
import { sendOtpEmail } from "../utils/mailer.js";

function toAuthUser(user) {
  return {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
    studentCardNumber: user.studentCardNumber,
    avatarUrl: user.avatarUrl || "",
    isVerified: user.isVerified,
  };
}

export async function register(req, res, next) {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: parsed.error.flatten(),
      });
    }

    const {
      password,
      studentCardNumber,
      firstName = "",
      lastName = "",
      phone = "",
    } = parsed.data;

    const email = parsed.data.email.trim().toLowerCase();

    const [exists, cardExists] = await Promise.all([
      User.findOne({ email }).select("_id").lean(),
      User.findOne({ studentCardNumber }).select("_id").lean(),
    ]);

    if (exists) {
      return res.status(409).json({ message: "Email déjà utilisé" });
    }

    if (cardExists) {
      return res
        .status(409)
        .json({ message: "Numéro de carte étudiant déjà utilisé" });
    }

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

    const code = generateOtp6();
    const codeHash = await bcrypt.hash(code, 10);

    await Otp.create({
      userId: user._id,
      codeHash,
      expiresAt: otpExpiresAt(),
      attempts: 0,
      consumedAt: null,
    });

    sendOtpEmail({ to: user.email, code }).catch((e) => {
      console.error("❌ OTP email send failed (register/background):", e?.message || e);
    });

    return res.status(201).json({
      message: "Compte créé. Vérifiez votre email pour le code OTP.",
      email: user.email,
      emailSent: true,
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyOtp(req, res, next) {
  try {
    const parsed = verifyOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: parsed.error.flatten(),
      });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const { code } = parsed.data;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

    if (user.isVerified) {
      const token = signToken({ sub: user._id.toString(), role: user.role });
      return res.json({
        token,
        user: toAuthUser(user),
      });
    }

    const otp = await Otp.findOne({
      userId: user._id,
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!otp) {
      return res
        .status(400)
        .json({ message: "Code expiré ou introuvable", code: "OTP_EXPIRED" });
    }

    const maxAttempts = Number(process.env.OTP_MAX_ATTEMPTS || 5);
    if (otp.attempts >= maxAttempts) {
      return res
        .status(429)
        .json({ message: "Trop de tentatives", code: "OTP_TOO_MANY_ATTEMPTS" });
    }

    const ok = await bcrypt.compare(code, otp.codeHash);
    otp.attempts += 1;
    await otp.save();

    if (!ok) {
      return res.status(400).json({ message: "Code OTP invalide", code: "OTP_INVALID" });
    }

    otp.consumedAt = new Date();
    user.isVerified = true;

    await Promise.all([otp.save(), user.save()]);

    const token = signToken({ sub: user._id.toString(), role: user.role });
    return res.json({
      token,
      user: toAuthUser(user),
    });
  } catch (err) {
    next(err);
  }
}

export async function resendOtp(req, res, next) {
  try {
    const parsed = resendOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: parsed.error.flatten(),
      });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const user = await User.findOne({ email }).select("_id email isVerified").lean();

    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });
    if (user.isVerified) return res.json({ message: "Compte déjà vérifié" });

    const cooldownSec = Number(process.env.OTP_RESEND_COOLDOWN_SEC || 60);
    const last = await Otp.findOne({ userId: user._id })
      .sort({ createdAt: -1 })
      .select("createdAt")
      .lean();

    if (
      last &&
      Date.now() - new Date(last.createdAt).getTime() < cooldownSec * 1000
    ) {
      return res.status(429).json({
        message: "Veuillez patienter avant de renvoyer un code",
        code: "RESEND_COOLDOWN",
      });
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

    sendOtpEmail({ to: user.email, code }).catch((e) => {
      console.error("OTP email send failed (resend/background):", e?.message || e);
    });

    return res.json({ message: "Nouveau code envoyé", emailSent: true });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: parsed.error.flatten(),
      });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const { password } = parsed.data;

    const user = await User.findOne({ email }).select(
      "_id email passwordHash firstName lastName phone role studentCardNumber avatarUrl isVerified"
    );

    if (!user) return res.status(401).json({ message: "Identifiants invalides" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Identifiants invalides" });

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Compte non vérifié. Validez l'OTP.",
        code: "NOT_VERIFIED",
      });
    }

    const token = signToken({ sub: user._id.toString(), role: user.role });

    res.json({
      token,
      user: toAuthUser(user),
    });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res) {
  res.json({ user: req.user });
}
