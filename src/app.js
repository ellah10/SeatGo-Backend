import express from "express";
import cors from "cors";
import path from "path";

// ✅ IMPORT DES ROUTES
import authRoutes from "./routes/auth.routes.js";
import tripRoutes from "./routes/trip.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import profileRoutes from "./routes/profile.routes.js";
import adminRoutes from "./routes/admin.routes.js";

const app = express();

// 🔥 Liste des origines autorisées
const allowedOrigins = ["http://localhost:5173", "https://seat-go.vercel.app", "https://seatgo.netlify.app/"];

app.use(
  cors({
    origin: function (origin, callback) {
      // Autorise Postman / requêtes sans origin
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// 📌 Servir les fichiers uploadés (avatars, etc.)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Route test
app.get("/", (req, res) => {
  res.json({ message: "SeatGo API fonctionne 🚀" });
});

// ✅ ROUTES API
app.use("/api/auth", authRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/admin", adminRoutes);

// ✅ Error handler (JSON)
app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error(err);

  if (err?.message === "INVALID_FILE_TYPE") {
    return res.status(400).json({ message: "Fichier invalide. Image uniquement." });
  }

  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "Image trop lourde (max 2MB)." });
  }

  return res.status(500).json({ message: "Erreur serveur" });
});

export default app;
