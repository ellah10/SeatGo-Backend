import { Router } from "express";
import { adminLogin } from "../controllers/admin.auth.controller.js";
import { getAdminDashboard } from "../controllers/admin.dashboard.controller.js";
import { listBuses, getBus, createBus, updateBus, deleteBus } from "../controllers/admin.bus.controller.js";
import {
  listAdminTrips,
  getAdminTrip,
  createAdminTrip,
  updateAdminTrip,
  deleteAdminTrip,
} from "../controllers/admin.trip.controller.js";
import {
  listAdminBookings,
  getAdminBooking,
  updateAdminBookingStatus,
} from "../controllers/admin.booking.controller.js";
import { verifyAdminQr } from "../controllers/admin.qr.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { requireRole } from "../middleware/roles.js";

const router = Router();

// Auth admin (page dédiée: /admin/login)
router.post("/auth/login", adminLogin);

// Dashboard (KPIs)
router.get("/dashboard", requireAuth, requireRole("admin"), getAdminDashboard);

// Bus (CRUD)
router.get("/buses", requireAuth, requireRole("admin"), listBuses);
router.post("/buses", requireAuth, requireRole("admin"), createBus);
router.get("/buses/:id", requireAuth, requireRole("admin"), getBus);
router.put("/buses/:id", requireAuth, requireRole("admin"), updateBus);
router.delete("/buses/:id", requireAuth, requireRole("admin"), deleteBus);

// Trajets / Horaires (CRUD)
router.get("/trips", requireAuth, requireRole("admin"), listAdminTrips);
router.post("/trips", requireAuth, requireRole("admin"), createAdminTrip);
router.get("/trips/:id", requireAuth, requireRole("admin"), getAdminTrip);
router.put("/trips/:id", requireAuth, requireRole("admin"), updateAdminTrip);
router.delete("/trips/:id", requireAuth, requireRole("admin"), deleteAdminTrip);

// Réservations (admin)
router.get("/bookings", requireAuth, requireRole("admin"), listAdminBookings);
router.get("/bookings/:id", requireAuth, requireRole("admin"), getAdminBooking);
router.patch("/bookings/:id/status", requireAuth, requireRole("admin"), updateAdminBookingStatus);

// Vérification QR / code réservation
router.get("/qr/verify", requireAuth, requireRole("admin"), verifyAdminQr);

export default router;
