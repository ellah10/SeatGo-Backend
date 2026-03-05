import bcrypt from "bcryptjs";
import { User } from "../models/User.js";

/**
 * Crée (une seule fois) le compte admin si les variables d'environnement sont présentes.
 *
 * Variables recommandées:
 * - ADMIN_EMAIL
 * - ADMIN_PASSWORD
 * - ADMIN_FIRST_NAME (optionnel)
 * - ADMIN_LAST_NAME (optionnel)
 * - ADMIN_PHONE (optionnel)
 * - ADMIN_CARD_NUMBER (optionnel, fallback: "ADMIN-0001")
 */
export async function ensureAdminAccount() {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = (process.env.ADMIN_PASSWORD || "").trim();

  if (!email || !password) {
    // Pas configuré — on ne crée rien.
    return;
  }

  const exists = await User.findOne({ email });
  if (exists) {
    // S'assure que le rôle est bien admin
    if (exists.role !== "admin") {
      exists.role = "admin";
      exists.isVerified = true;
      await exists.save();
    }
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const studentCardNumber = (process.env.ADMIN_CARD_NUMBER || "ADMIN-0001").trim();

  await User.create({
    email,
    passwordHash,
    firstName: process.env.ADMIN_FIRST_NAME || "Admin",
    lastName: process.env.ADMIN_LAST_NAME || "SeatGo",
    phone: process.env.ADMIN_PHONE || "",
    studentCardNumber,
    isVerified: true,
    role: "admin",
  });

  // eslint-disable-next-line no-console
  console.log("✅ Compte admin créé :", email);
}
