import { Trip } from "../models/Trip.js";
import { Booking } from "../models/Booking.js";

export async function listTrips(req, res, next) {
  try {
    const { departure, destination, date } = req.query;

    const filter = {};

    filter.$or = [{ status: { $exists: false } }, { status: "ACTIVE" }];


    if (departure) {
      filter.departure = { $regex: departure.trim(), $options: "i" };
    }

    if (destination) {
      filter.destination = { $regex: destination.trim(), $options: "i" };
    }

    if (date) {
      filter.date = date;
    }

    const trips = await Trip.find(filter).sort({ date: 1, departureTime: 1 });
    return res.json({ trips });
  } catch (err) {
    next(err);
  }
}

export async function getTrip(req, res, next) {
  try {
    const trip = await Trip.findById(req.params.id);
    if (!trip) return res.status(404).json({ message: "Trajet introuvable" });
    return res.json({ trip });
  } catch (err) {
    next(err);
  }
}

export async function getTripSeats(req, res, next) {
  try {
    const tripId = req.params.id;
    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ message: "Trajet introuvable" });

    const bookings = await Booking.find({
      tripId,
      status: { $in: ["PENDING_PAYMENT", "PAID"] },
    }).select("seatNumber -_id");

    const takenSeats = bookings.map((b) => b.seatNumber);

    return res.json({
      tripId,
      capacity: trip.capacity,
      takenSeats,
    });
  } catch (err) {
    next(err);
  }
}