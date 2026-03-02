import { z } from "zod";

export const registerSchema = z.object({
  firstName: z.string().trim().min(1, "Prénom requis").optional(),
  lastName: z.string().trim().min(1, "Nom requis").optional(),
  phone: z.string().trim().min(6, "Téléphone invalide").optional(),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Mot de passe: 6 caractères minimum"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const createBookingSchema = z.object({
  tripId: z.string().min(1),
  seatNumber: z.number().int().min(1),
  method: z.enum(["flooz", "tmoney"]),
  phone: z.string().trim().min(6).optional(),
});
