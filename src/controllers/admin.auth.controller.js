import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { signToken } from "../utils/jwt.js";
import { loginSchema } from "./validators.js";

export async function adminLogin(req, res, next) {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation error", errors: parsed.error.flatten() });
    }

    const { email, password } = parsed.data;
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) return res.status(401).json({ message: "Identifiants invalides" });
    if (user.role !== "admin") return res.status(403).json({ message: "Compte non autorisé" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Identifiants invalides" });

    if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }

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
        avatarUrl: user.avatarUrl || "",
        isVerified: true,
      },
    });
  } catch (err) {
    next(err);
  }
}
