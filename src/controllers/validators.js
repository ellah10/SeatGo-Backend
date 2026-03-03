import { z } from "zod";

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, "Prénom requis").optional(),
  lastName: z.string().trim().min(1, "Nom requis").optional(),
  phone: z.string().trim().min(6, "Téléphone invalide").optional(),
  studentCardNumber: z.string().trim().min(3, "Numéro de carte étudiant requis"),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Mot de passe: 6 caractères minimum"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const verifyOtpSchema = z.object({
  email: z.string().email("Email invalide"),
  code: z.string().regex(/^\d{6}$/, "Code OTP invalide"),
});

export const resendOtpSchema = z.object({
  email: z.string().email("Email invalide"),
});

export const createBookingSchema = z.object({
  tripId: z.string().min(1),
  seatNumber: z.number().int().min(1),
  method: z.enum(["flooz", "tmoney"]),
  phone: z.string().trim().min(6).optional(),
});
