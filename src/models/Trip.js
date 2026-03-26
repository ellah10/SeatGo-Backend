import mongoose from "mongoose";

const tripSchema = new mongoose.Schema(
  {
    departure: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    date: { type: String, required: true, trim: true },
    departureTime: { type: String, required: true, trim: true },
    arrivalTime: { type: String, required: true, trim: true },
    duration: { type: String, required: true, trim: true },
    busType: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    capacity: { type: Number, default: 32, min: 1 },

    busId: { type: mongoose.Schema.Types.ObjectId, ref: "Bus" },

    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
  },
  { timestamps: true }
);

tripSchema.index({ departure: 1, destination: 1, date: 1 });
tripSchema.index({ status: 1, date: 1 });

export const Trip = mongoose.model("Trip", tripSchema);
