import mongoose from "mongoose";

const tripSchema = new mongoose.Schema(
  {
    departure: { type: String, required: true, trim: true },
    destination: { type: String, required: true, trim: true },
    date: { type: String, required: true, trim: true }, // "YYYY-MM-DD" (comme ton frontend)
    departureTime: { type: String, required: true, trim: true }, // "07:30"
    arrivalTime: { type: String, required: true, trim: true },
    duration: { type: String, required: true, trim: true }, // "5h40"
    // garde ce champ pour compatibilité UI (ex: "VIP Climatisé")
    busType: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    capacity: { type: Number, default: 32, min: 1 },

    // Liaison avec un bus géré par l'admin (recommandé)
    busId: { type: mongoose.Schema.Types.ObjectId, ref: "Bus" },

    // Permet à l'admin de désactiver un départ sans casser l'app
    status: { type: String, enum: ["ACTIVE", "INACTIVE"], default: "ACTIVE" },
  },
  { timestamps: true }
);

// Accélère la recherche
tripSchema.index({ departure: 1, destination: 1, date: 1 });

export const Trip = mongoose.model("Trip", tripSchema);
