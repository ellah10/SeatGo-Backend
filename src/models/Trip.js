import mongoose from "mongoose";

const tripSchema = new mongoose.Schema(
  {
    departure: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    date: { type: String, required: true, trim: true }, // "YYYY-MM-DD" (comme ton frontend)
    departureTime: { type: String, required: true, trim: true }, // "07:30"
    arrivalTime: { type: String, required: true, trim: true },
    duration: { type: String, required: true, trim: true }, // "5h40"
    busType: { type: String, required: true, trim: true }, // "VIP Climatisé"
    price: { type: Number, required: true, min: 0 },
    capacity: { type: Number, default: 32, min: 1 },
  },
  { timestamps: true }
);

// Accélère la recherche
tripSchema.index({ departure: 1, destination: 1, date: 1 });

export const Trip = mongoose.model("Trip", tripSchema);
