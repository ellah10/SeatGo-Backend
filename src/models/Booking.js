import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    bookingCode: { type: String, required: true, unique: true },

    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true },

    seatNumber: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["PENDING_PAYMENT", "PAID", "CANCELLED", "USED"],
      default: "PAID", // pour coller à ton paiement simulé
    },

    payment: {
      method: { type: String, enum: ["flooz", "tmoney"], required: true },
      phone: { type: String, default: "" },
      reference: { type: String, default: "" },
      paidAt: { type: Date, default: Date.now },
    },
  },
  { timestamps: true }
);

/**
 * IMPORTANT: empêcher double réservation d'un siège sur un même trip
 * - unique index (tripId + seatNumber) UNIQUEMENT quand status est actif
 * - status actif = PENDING_PAYMENT ou PAID
 */
bookingSchema.index(
  { tripId: 1, seatNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["PENDING_PAYMENT", "PAID"] } },
  }
);

export const Booking = mongoose.model("Booking", bookingSchema);
