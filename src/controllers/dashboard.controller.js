import { Booking } from "../models/Booking.js";

/**
 * GET /api/dashboard/student
 * Dashboard étudiant: stats + dernières réservations
 * Auth: Bearer token (requireAuth)
 */
export async function getStudentDashboard(req, res, next) {
  try {
    const user = req.user; // injecté par requireAuth

    const baseFilter = { userId: user._id };

    const [totalBookings, pendingPayment, paid, cancelled, used] = await Promise.all([
      Booking.countDocuments(baseFilter),
      Booking.countDocuments({ ...baseFilter, status: "PENDING_PAYMENT" }),
      Booking.countDocuments({ ...baseFilter, status: "PAID" }),
      Booking.countDocuments({ ...baseFilter, status: "CANCELLED" }),
      Booking.countDocuments({ ...baseFilter, status: "USED" }),
    ]);

    const recent = await Booking.find(baseFilter)
      .sort({ createdAt: -1 })
      .limit(5)
      .select("bookingCode seatNumber status tripId createdAt")
      .populate({
        path: "tripId",
        select: "departure destination date departureTime arrivalTime duration price busType",
      });

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
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        studentCardNumber: user.studentCardNumber,
        avatarUrl: user.avatarUrl || "",
      },
      stats: {
        totalBookings,
        pendingPayment,
        paid,
        cancelled,
        used,
      },
      recentBookings,
    });
  } catch (err) {
    next(err);
  }
}
