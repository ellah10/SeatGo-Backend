import { Booking } from "../models/Booking.js";

export async function getStudentDashboard(req, res, next) {
  try {
    const baseFilter = { userId: req.user._id };

    const [statsAgg, recent] = await Promise.all([
      Booking.aggregate([
        { $match: baseFilter },
        {
          $group: {
            _id: null,
            totalBookings: { $sum: 1 },
            pendingPayment: {
              $sum: {
                $cond: [{ $eq: ["$status", "PENDING_PAYMENT"] }, 1, 0],
              },
            },
            paid: {
              $sum: {
                $cond: [{ $eq: ["$status", "PAID"] }, 1, 0],
              },
            },
            cancelled: {
              $sum: {
                $cond: [{ $eq: ["$status", "CANCELLED"] }, 1, 0],
              },
            },
            used: {
              $sum: {
                $cond: [{ $eq: ["$status", "USED"] }, 1, 0],
              },
            },
          },
        },
      ]),
      Booking.find(baseFilter)
        .sort({ createdAt: -1 })
        .limit(5)
        .select("bookingCode seatNumber status tripId createdAt")
        .populate({
          path: "tripId",
          select: "departure destination date departureTime arrivalTime duration price busType",
        })
        .lean(),
    ]);

    const stats = statsAgg?.[0] || {
      totalBookings: 0,
      pendingPayment: 0,
      paid: 0,
      cancelled: 0,
      used: 0,
    };

    const recentBookings = recent.map((b) => ({
      id: b._id,
      bookingCode: b.bookingCode,
      seatNumber: b.seatNumber,
      status: b.status,
      createdAt: b.createdAt,
      trip: b.tripId,
    }));

    res.json({
      student: {
        id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        phone: req.user.phone,
        studentCardNumber: req.user.studentCardNumber,
        avatarUrl: req.user.avatarUrl || "",
      },
      stats: {
        totalBookings: stats.totalBookings,
        pendingPayment: stats.pendingPayment,
        paid: stats.paid,
        cancelled: stats.cancelled,
        used: stats.used,
      },
      recentBookings,
    });
  } catch (err) {
    next(err);
  }
}
