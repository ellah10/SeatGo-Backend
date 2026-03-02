import express from "express";
import cors from "cors";

// ✅ IMPORT DES ROUTES
import authRoutes from "./routes/auth.routes.js";
import tripRoutes from "./routes/trip.routes.js";
import bookingRoutes from "./routes/booking.routes.js";

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());

// Route test
app.get("/", (req, res) => {
  res.json({ message: "SeatGo API fonctionne 🚀" });
});

// ✅ ROUTES API
app.use("/api/auth", authRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/bookings", bookingRoutes);

export default app;