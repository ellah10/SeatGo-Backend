import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, trim: true, default: "" },
    lastName: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },

    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },

    // ✅ Ajouts SeatGo (auth solide)
    // - Carte étudiant obligatoire
    // - Compte bloqué tant que l'OTP n'est pas validé
    studentCardNumber: { type: String, required: true, unique: true, trim: true },
    isVerified: { type: Boolean, default: false },
    avatarUrl: { type: String, default: "" },

    role: { type: String, enum: ["user", "admin"], default: "user" },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
