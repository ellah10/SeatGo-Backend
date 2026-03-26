import { Booking } from "../models/Booking.js";
import { Trip } from "../models/Trip.js";
import { createBookingSchema } from "./validators.js";

function makeBookingCode() {

  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SG-${Date.now()}-${rand}`;
}

function makePaymentRef(method) {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `${method.toUpperCase()}-${Date.now()}-${rand}`;
}

export async function createBooking(req, res, next) {
  try {
    const parsed = createBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation error", errors: parsed.error.flatten() });
    }

    const { tripId, seatNumber, method, phone = "" } = parsed.data;

    const trip = await Trip.findById(tripId);
    if (!trip) return res.status(404).json({ message: "Trajet introuvable" });

    if (seatNumber > trip.capacity) {
      return res.status(400).json({ message: `Siège invalide: max ${trip.capacity}` });
    }

    const booking = await Booking.create({
      bookingCode: makeBookingCode(),
      userId: req.user._id,
      tripId: trip._id,
      seatNumber,
      status: "PAID",
      payment: {
        method,
        phone,
        reference: makePaymentRef(method),
        paidAt: new Date(),
      },
    });

    res.status(201).json({
      booking: {
        id: booking._id,
        bookingCode: booking.bookingCode,
        tripId: booking.tripId,
        seatNumber: booking.seatNumber,
        status: booking.status,
        payment: booking.payment,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function myBookings(req, res, next) {
  try {
    const bookings = await Booking.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .populate("tripId");

    const mapped = bookings.map((b) => ({
      id: b._id,
      bookingCode: b.bookingCode,
      seatNumber: b.seatNumber,
      status: b.status,
      payment: b.payment,
      trip: b.tripId,
      createdAt: b.createdAt,
    }));

    res.json({ bookings: mapped });
  } catch (err) {
    next(err);
  }
}

export async function getBooking(req, res, next) {
  try {
    const booking = await Booking.findById(req.params.id).populate("tripId").populate("userId", "firstName lastName email phone");
    if (!booking) return res.status(404).json({ message: "Réservation introuvable" });

    res.json({
      booking: {
        id: booking._id,
        bookingCode: booking.bookingCode,
        seatNumber: booking.seatNumber,
        status: booking.status,
        payment: booking.payment,
        trip: booking.tripId,
        passenger: booking.userId, 
        createdAt: booking.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
}
