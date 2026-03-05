import mongoose from "mongoose";

const busSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    departurePoint: { type: String, required: true, trim: true }, // point de départ / base
    seats: { type: Number, required: true, min: 1 },
    plateNumber: { type: String, trim: true, default: "" }, // optionnel
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
  },
  { timestamps: true }
);

// Recommandé: nom unique côté université
busSchema.index({ name: 1 }, { unique: true });

export const Bus = mongoose.model("Bus", busSchema);
