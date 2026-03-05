import { z } from "zod";
import { User } from "../models/User.js";

function toClientUser(user) {
  if (!user) return null;
  return {
    id: user._id.toString(),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
    studentCardNumber: user.studentCardNumber,
    isVerified: user.isVerified,
    avatarUrl: user.avatarUrl || "",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

const updateProfileSchema = z
  .object({
    firstName: z.string().trim().max(60).optional(),
    lastName: z.string().trim().max(60).optional(),
    phone: z.string().trim().max(30).optional(),
    studentCardNumber: z.string().trim().min(3).max(60).optional(),
  })
  .strict();

/**
 * GET /api/profile/me
 */
export async function getMyProfile(req, res, next) {
  try {
    // requireAuth a déjà injecté req.user (sans passwordHash)
    return res.json({ user: toClientUser(req.user) });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/profile/me
 */
export async function updateMyProfile(req, res, next) {
  try {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation error", errors: parsed.error.flatten() });
    }

    const updates = parsed.data;

    // Nettoyage léger
    if (typeof updates.firstName === "string") updates.firstName = updates.firstName.trim();
    if (typeof updates.lastName === "string") updates.lastName = updates.lastName.trim();
    if (typeof updates.phone === "string") updates.phone = updates.phone.trim();
    if (typeof updates.studentCardNumber === "string") updates.studentCardNumber = updates.studentCardNumber.trim();

    // Unicité carte étudiant si changement
    if (
      updates.studentCardNumber &&
      updates.studentCardNumber !== req.user.studentCardNumber
    ) {
      const exists = await User.findOne({ studentCardNumber: updates.studentCardNumber });
      if (exists) {
        return res.status(409).json({ message: "Numéro de carte étudiant déjà utilisé" });
      }
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select("-passwordHash");

    return res.json({ user: toClientUser(user) });
  } catch (err) {
    // duplicate key error fallback
    if (err?.code === 11000) {
      if (err?.keyPattern?.studentCardNumber) {
        return res.status(409).json({ message: "Numéro de carte étudiant déjà utilisé" });
      }
      if (err?.keyPattern?.email) {
        return res.status(409).json({ message: "Email déjà utilisé" });
      }
    }
    next(err);
  }
}

/**
 * POST /api/profile/me/avatar
 * multipart/form-data: avatar=<file>
 */
export async function uploadMyAvatar(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: "Fichier manquant" });

    const baseUrl =
      process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;

    const avatarUrl = `${baseUrl}/uploads/avatars/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatarUrl },
      { new: true }
    ).select("-passwordHash");

    return res.json({ user: toClientUser(user) });
  } catch (err) {
    next(err);
  }
}
