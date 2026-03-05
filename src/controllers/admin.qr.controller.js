import mongoose from "mongoose";
import { Booking } from "../models/Booking.js";

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseLookup(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return { error: "Valeur QR/code manquante" };

  // Cas 1: QR contient une URL du type .../ticket/<bookingId>
  const m = raw.match(/\/ticket\/([a-f0-9]{24})(?:[?#/].*)?$/i);
  if (m && mongoose.Types.ObjectId.isValid(m[1])) {
    return { kind: "id", value: m[1] };
  }

  // Cas 2: QR contient directement un ObjectId
  if (mongoose.Types.ObjectId.isValid(raw)) {
    return { kind: "id", value: raw };
  }

  // Cas 3: code réservation (SG-...)
  return { kind: "code", value: raw };
}

export async function verifyAdminQr(req, res, next) {
  try {
    const { value } = req.query;
    const lookup = parseLookup(value);
    if (lookup.error) return res.status(400).json({ message: lookup.error });

    let booking = null;

    if (lookup.kind === "id") {
      booking = await Booking.findById(lookup.value)
        .populate("userId", "firstName lastName email phone studentCardNumber avatarUrl")
        .populate({
          path: "tripId",
          select: "departure destination date departureTime arrivalTime duration busType price capacity busId",
          populate: { path: "busId", select: "name seats departurePoint plateNumber" },
        });
    } else {
      const code = String(lookup.value).trim();
      booking = await Booking.findOne({ bookingCode: new RegExp(`^${escapeRegex(code)}$`, "i") })
        .populate("userId", "firstName lastName email phone studentCardNumber avatarUrl")
        .populate({
          path: "tripId",
          select: "departure destination date departureTime arrivalTime duration busType price capacity busId",
          populate: { path: "busId", select: "name seats departurePoint plateNumber" },
        });
    }

    if (!booking) {
      return res.json({
        valid: false,
        reason: "NOT_FOUND",
        message: "Réservation introuvable",
      });
    }

    if (booking.status === "CANCELLED") {
      return res.json({
        valid: false,
        reason: "CANCELLED",
        message: "Réservation annulée",
        booking: {
          id: booking._id,
          bookingCode: booking.bookingCode,
          status: booking.status,
        },
      });
    }

    if (booking.status === "USED") {
      return res.json({
        valid: false,
        reason: "ALREADY_USED",
        message: "Réservation déjà utilisée",
        booking: {
          id: booking._id,
          bookingCode: booking.bookingCode,
          status: booking.status,
          updatedAt: booking.updatedAt,
        },
      });
    }

    return res.json({
      valid: true,
      reason: "OK",
      message: "Réservation valide",
      booking: {
        id: booking._id,
        bookingCode: booking.bookingCode,
        status: booking.status,
        seatNumber: booking.seatNumber,
        payment: booking.payment,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
      },
      user: booking.userId,
      trip: booking.tripId,
    });
  } catch (err) {
    return next(err);
  }
}
