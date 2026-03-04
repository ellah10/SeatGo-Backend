import express from "express";
import cors from "cors";

// ✅ IMPORT DES ROUTES
import authRoutes from "./routes/auth.routes.js";
import tripRoutes from "./routes/trip.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";

const app = express();

// 🔥 Liste des origines autorisées
const allowedOrigins = [
  "http://localhost:5173",
  "https://seat-go.vercel.app"
];

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

// Route test
app.get("/", (req, res) => {
  res.json({ message: "SeatGo API fonctionne 🚀" });
});

// ✅ ROUTES API
app.use("/api/auth", authRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/dashboard", dashboardRoutes);

export default app;