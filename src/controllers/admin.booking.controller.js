import mongoose from "mongoose";
import { z } from "zod";
import { Booking } from "../models/Booking.js";
import { Trip } from "../models/Trip.js";
import { User } from "../models/User.js";

const STATUS = ["PENDING_PAYMENT", "PAID", "CANCELLED", "USED"];

const updateStatusSchema = z.object({
  status: z.enum(["PENDING_PAYMENT", "PAID", "CANCELLED", "USED"]),
});

function toInt(v, fallback) {
  const n = Number(v);
  if (Number.isFinite(n) && n > 0) return Math.floor(n);
  return fallback;
}

export async function listAdminBookings(req, res, next) {
  try {
    const {
      q = "",
      status,
      date, 
      tripId,
      page = "1",
      limit = "20",
    } = req.query;

    const pageNum = toInt(page, 1);
    const limitNum = Math.min(toInt(limit, 20), 100);

    const filter = {};
    
    if (status && STATUS.includes(String(status))) {
      filter.status = String(status);
    }

    if (tripId) {
      const id = String(tripId);
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ message: "tripId invalide" });
      }
      filter.tripId = id;
    }

    if (date) {
      const dateStr = String(date).trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return res.status(400).json({ message: "date invalide (attendu YYYY-MM-DD)" });
      }

      const trips = await Trip.find({ date: dateStr }).select("_id");
      const ids = trips.map((t) => t._id);

      if (filter.tripId) {
        const same = ids.find((x) => String(x) === String(filter.tripId));
        if (!same) {
          return res.json({ bookings: [], meta: { total: 0, page: pageNum, limit: limitNum, pages: 0 } });
        }
      } else {
        filter.tripId = { $in: ids };
      }
    }

    const qStr = String(q).trim();
    if (qStr) {
      const rx = { $regex: qStr, $options: "i" };

      const bookingOr = [{ bookingCode: rx }];

      const userRx = { $regex: qStr, $options: "i" };
      const users = await User.find({
        $or: [
          { email: userRx },
          { studentCardNumber: userRx },
          { firstName: userRx },
          { lastName: userRx },
          { phone: userRx },
        ],
      })
        .select("_id")
        .limit(200);

      if (users.length) {
        bookingOr.push({ userId: { $in: users.map((u) => u._id) } });
      }

      filter.$or = bookingOr;
    }

    const total = await Booking.countDocuments(filter);
    const pages = Math.ceil(total / limitNum);
    const skip = (pageNum - 1) * limitNum;

    const bookings = await Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate("userId", "firstName lastName email phone studentCardNumber")
      .populate({
        path: "tripId",
        select: "departure destination date departureTime arrivalTime busType price capacity busId",
        populate: { path: "busId", select: "name seats" },
      });

    const mapped = bookings.map((b) => ({
      id: b._id,
      bookingCode: b.bookingCode,
      status: b.status,
      seatNumber: b.seatNumber,
      payment: b.payment,
      createdAt: b.createdAt,
      user: b.userId,
      trip: b.tripId,
    }));

    return res.json({
      bookings: mapped,
      meta: { total, page: pageNum, limit: limitNum, pages },
    });
  } catch (err) {
    return next(err);
  }
}

export async function getAdminBooking(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "ID invalide" });

    const booking = await Booking.findById(id)
      .populate("userId", "firstName lastName email phone studentCardNumber avatarUrl")
      .populate({
        path: "tripId",
        select: "departure destination date departureTime arrivalTime duration busType price capacity busId",
        populate: { path: "busId", select: "name seats departurePoint plateNumber" },
      });

    if (!booking) return res.status(404).json({ message: "Réservation introuvable" });

    return res.json({
      booking: {
        id: booking._id,
        bookingCode: booking.bookingCode,
        status: booking.status,
        seatNumber: booking.seatNumber,
        payment: booking.payment,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
        user: booking.userId,
        trip: booking.tripId,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function updateAdminBookingStatus(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "ID invalide" });

    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation error", errors: parsed.error.flatten() });
    }

    const { status } = parsed.data;

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ message: "Réservation introuvable" });

    if (booking.status === "USED" && status !== "USED") {
      return res.status(400).json({ message: "Réservation déjà utilisée (statut verrouillé)" });
    }
    if (booking.status === "CANCELLED" && status === "USED") {
      return res.status(400).json({ message: "Impossible de marquer USED une réservation annulée" });
    }

    booking.status = status;
    if (status === "PAID") {
      booking.payment = booking.payment || { method: "flooz" };
      booking.payment.paidAt = booking.payment.paidAt || new Date();
    }

    await booking.save();

    const updated = await Booking.findById(id)
      .populate("userId", "firstName lastName email phone studentCardNumber avatarUrl")
      .populate({
        path: "tripId",
        select: "departure destination date departureTime arrivalTime duration busType price capacity busId",
        populate: { path: "busId", select: "name seats departurePoint plateNumber" },
      });

    return res.json({
      booking: {
        id: updated._id,
        bookingCode: updated.bookingCode,
        status: updated.status,
        seatNumber: updated.seatNumber,
        payment: updated.payment,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        user: updated.userId,
        trip: updated.tripId,
      },
    });
  } catch (err) {
    if (String(err?.code) === "11000") {
      return res.status(409).json({ message: "Conflit: ce siège est déjà réservé sur ce trajet" });
    }
    return next(err);
  }
}
