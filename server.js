import dotenv from "dotenv";
import mongoose from "mongoose";
import app from "./src/app.js";
import { ensureAdminAccount } from "./src/utils/ensureAdmin.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB connecté");
    await ensureAdminAccount();
  })
  .catch((err) => console.log("❌ Erreur MongoDB:", err));

app.listen(PORT, () => {
  console.log(`🚀 API prête sur http://localhost:${PORT}`);
});
console.log("MONGO_URI =", process.env.MONGO_URI ? "OK" : "MANQUANT");