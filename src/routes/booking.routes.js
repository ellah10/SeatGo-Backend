import { Router } from "express";
import { createBooking, getBooking, myBookings } from "../controllers/booking.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

router.post("/", requireAuth, createBooking);
router.get("/me", requireAuth, myBookings);
router.get("/:id", getBooking);

export default router;
