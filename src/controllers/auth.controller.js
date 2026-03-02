import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { signToken } from "../utils/jwt.js";
import { registerSchema, loginSchema } from "./validators.js";

export async function register(req, res, next) {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation error", errors: parsed.error.flatten() });
    }

    const { email, password, firstName = "", lastName = "", phone = "" } = parsed.data;

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "Email déjà utilisé" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, passwordHash, firstName, lastName, phone });

    const token = signToken({ sub: user._id.toString(), role: user.role });

    res.status(201).json({
      token,
      user: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, phone: user.phone, role: user.role },
    });
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

    const token = signToken({ sub: user._id.toString(), role: user.role });

    res.json({
      token,
      user: { id: user._id, email: user.email, firstName: user.firstName, lastName: user.lastName, phone: user.phone, role: user.role },
    });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res) {
  // requireAuth a déjà mis req.user
  res.json({ user: req.user });
}
