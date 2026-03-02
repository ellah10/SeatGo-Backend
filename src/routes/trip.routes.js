import { Router } from "express";
import { getTrip, getTripSeats, listTrips } from "../controllers/trip.controller.js";

const router = Router();

router.get("/", listTrips);
router.get("/:id", getTrip);
router.get("/:id/seats", getTripSeats);

export default router;
