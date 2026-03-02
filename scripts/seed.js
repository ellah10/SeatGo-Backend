import dotenv from "dotenv";
import mongoose from "mongoose";
import { Trip } from "../src/models/Trip.js";

dotenv.config();

const trips = [
  {
    "departure": "Lomé",
    "destination": "Kara",
    "date": "2026-03-02",
    "departureTime": "07:30",
    "arrivalTime": "13:10",
    "duration": "5h40",
    "busType": "VIP Climatisé",
    "price": 2500,
    "capacity": 32
  },
  {
    "departure": "Lomé",
    "destination": "Sokodé",
    "date": "2026-03-02",
    "departureTime": "10:00",
    "arrivalTime": "14:20",
    "duration": "4h20",
    "busType": "Standard",
    "price": 2000,
    "capacity": 32
  },
  {
    "departure": "Kara",
    "destination": "Dapaong",
    "date": "2026-03-03",
    "departureTime": "08:00",
    "arrivalTime": "12:10",
    "duration": "4h10",
    "busType": "VIP Climatisé",
    "price": 3000,
    "capacity": 32
  }
];

async function run() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI manquant dans .env");

  await mongoose.connect(uri);

  // Nettoie puis insère
  await Trip.deleteMany({});
  await Trip.insertMany(trips);

  console.log("✅ Seed terminé: trajets insérés =", trips.length);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
