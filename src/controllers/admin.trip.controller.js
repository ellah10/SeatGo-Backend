import mongoose from "mongoose";
import { Trip } from "../models/Trip.js";
import { Bus } from "../models/Bus.js";
import { Booking } from "../models/Booking.js";

function isValidDateString(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
}

function isValidTimeString(s) {
  return /^\d{2}:\d{2}$/.test(String(s || ""));
}

function pickTripPayload(body) {
  return {
    departure: String(body.departure || "").trim(),
    destination: String(body.destination || "").trim(),
    date: String(body.date || "").trim(),
    departureTime: String(body.departureTime || "").trim(),
    arrivalTime: String(body.arrivalTime || "").trim(),
    duration: String(body.duration || "").trim(),
    busType: String(body.busType || "").trim(),
    price: Number(body.price),
    capacity: body.capacity === undefined || body.capacity === null || body.capacity === "" ? undefined : Number(body.capacity),
    busId: body.busId ? String(body.busId) : "",
    status: body.status ? String(body.status) : "ACTIVE",
  };
}

function validateTripPayload(p, { requireBusId = true } = {}) {
  const errors = {};

  if (!p.departure) errors.departure = "Départ requis";
  if (!p.destination) errors.destination = "Destination requise";

  if (!p.date || !isValidDateString(p.date)) errors.date = "Date invalide (YYYY-MM-DD)";
  if (!p.departureTime || !isValidTimeString(p.departureTime)) errors.departureTime = "Heure départ invalide (HH:MM)";
  if (!p.arrivalTime || !isValidTimeString(p.arrivalTime)) errors.arrivalTime = "Heure arrivée invalide (HH:MM)";

  if (!p.duration) errors.duration = "Durée requise";
  if (!p.busType) errors.busType = "Type de bus requis";

  if (Number.isNaN(p.price) || p.price < 0) errors.price = "Prix invalide";

  if (p.capacity !== undefined) {
    if (Number.isNaN(p.capacity) || p.capacity < 1) errors.capacity = "Capacité invalide";
  }

  if (p.status && !["ACTIVE", "INACTIVE"].includes(p.status)) errors.status = "Statut invalide";

  if (requireBusId) {
    if (!p.busId || !mongoose.Types.ObjectId.isValid(p.busId)) errors.busId = "Bus requis";
  } else if (p.busId && !mongoose.Types.ObjectId.isValid(p.busId)) {
    errors.busId = "Bus invalide";
  }

  return errors;
}

export async function listAdminTrips(req, res, next) {
  try {
    const { q = "", status = "", date = "", departure = "", destination = "", busId = "" } = req.query;

    const filter = {};

    if (status) filter.status = status;

    if (busId && mongoose.Types.ObjectId.isValid(busId)) {
      filter.busId = busId;
    }

    if (date && isValidDateString(date)) {
      filter.date = date;
    }

    if (departure) filter.departure = { $regex: departure.trim(), $options: "i" };
    if (destination) filter.destination = { $regex: destination.trim(), $options: "i" };

    if (q) {
      const qq = q.trim();
      if (qq) {
        filter.$or = [
          { departure: { $regex: qq, $options: "i" } },
          { destination: { $regex: qq, $options: "i" } },
          { busType: { $regex: qq, $options: "i" } },
        ];
      }
    }

    const trips = await Trip.find(filter)
      .populate("busId")
      .sort({ date: 1, departureTime: 1, createdAt: -1 });

    res.json({ trips });
  } catch (err) {
    next(err);
  }
}

export async function getAdminTrip(req, res, next) {
  try {
    const trip = await Trip.findById(req.params.id).populate("busId");
    if (!trip) return res.status(404).json({ message: "Départ introuvable" });
    res.json({ trip });
  } catch (err) {
    next(err);
  }
}

export async function createAdminTrip(req, res, next) {
  try {
    const payload = pickTripPayload(req.body);
    const errors = validateTripPayload(payload, { requireBusId: true });
    if (Object.keys(errors).length) {
      return res.status(400).json({ message: "Validation error", errors });
    }

    const bus = await Bus.findById(payload.busId);
    if (!bus) return res.status(404).json({ message: "Bus introuvable" });

    const capacity = payload.capacity ?? bus.seats;

    const trip = await Trip.create({
      departure: payload.departure,
      destination: payload.destination,
      date: payload.date,
      departureTime: payload.departureTime,
      arrivalTime: payload.arrivalTime,
      duration: payload.duration,
      busType: payload.busType || bus.name,
      price: payload.price,
      capacity,
      busId: bus._id,
      status: payload.status || "ACTIVE",
    });

    const created = await Trip.findById(trip._id).populate("busId");

    res.status(201).json({ trip: created });
  } catch (err) {
    next(err);
  }
}

export async function updateAdminTrip(req, res, next) {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: "Départ introuvable" });

    const payload = pickTripPayload(req.body);
    const errors = validateTripPayload(payload, { requireBusId: false });
    if (Object.keys(errors).length) {
      return res.status(400).json({ message: "Validation error", errors });
    }

    let bus = null;
    let busChanged = false;

    if (payload.busId) {
      busChanged = String(trip.busId || "") !== String(payload.busId);
      bus = await Bus.findById(payload.busId);
      if (!bus) return res.status(404).json({ message: "Bus introuvable" });
    }

    let capacity = payload.capacity;
    if (capacity === undefined) {
      if (busChanged && bus) capacity = bus.seats;
    }

    trip.departure = payload.departure || trip.departure;
    trip.destination = payload.destination || trip.destination;
    if (payload.date) trip.date = payload.date;
    if (payload.departureTime) trip.departureTime = payload.departureTime;
    if (payload.arrivalTime) trip.arrivalTime = payload.arrivalTime;
    if (payload.duration) trip.duration = payload.duration;
    if (payload.busType) trip.busType = payload.busType;
    if (!Number.isNaN(payload.price)) trip.price = payload.price;
    if (capacity !== undefined) trip.capacity = capacity;
    if (payload.busId) trip.busId = payload.busId;
    if (payload.status) trip.status = payload.status;

    await trip.save();

    const updated = await Trip.findById(trip._id).populate("busId");
    res.json({ trip: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteAdminTrip(req, res, next) {
  try {
    const tripId = req.params.id;

    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ message: "Départ introuvable" });

    // Eviter de casser l'historique: s'il y a des réservations, on demande de désactiver au lieu de supprimer.
    const hasBookings =
      (await Booking.countDocuments({
        tripId,
        status: { $in: ["PENDING_PAYMENT", "PAID", "USED"] },
      })) > 0;

    if (hasBookings) {
      return res.status(400).json({
        message:
          "Impossible de supprimer ce départ: des réservations existent. Désactive-le plutôt (statut INACTIVE).",
      });
    }

    await Trip.deleteOne({ _id: tripId });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
