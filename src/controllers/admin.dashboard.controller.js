import { Booking } from "../models/Booking.js";
import { Trip } from "../models/Trip.js";

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function getRangeDates(range = "today") {
  const now = new Date();

  if (range === "yesterday") {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return { from: startOfDay(y), to: endOfDay(y) };
  }

  if (range === "week") {
    // 7 derniers jours (incluant aujourd'hui)
    const from = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));
    const to = endOfDay(now);
    return { from, to };
  }

  if (range === "month") {
    // 30 derniers jours (incluant aujourd'hui)
    const from = startOfDay(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000));
    const to = endOfDay(now);
    return { from, to };
  }

  // today
  return { from: startOfDay(now), to: endOfDay(now) };
}

export async function getAdminDashboard(req, res, next) {
  try {
    const range = (req.query.range || "today").toString();
    const { from, to } = getRangeDates(range);

    const match = { createdAt: { $gte: from, $lte: to } };

    const byStatus = await Booking.aggregate([
      { $match: match },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const statusMap = byStatus.reduce((acc, it) => {
      acc[it._id] = it.count;
      return acc;
    }, {});

    const totalBookings = byStatus.reduce((sum, it) => sum + it.count, 0);
    const pendingPayment = statusMap.PENDING_PAYMENT || 0;
    const paid = statusMap.PAID || 0;
    const cancelled = statusMap.CANCELLED || 0;
    const used = statusMap.USED || 0;

    // Taux de remplissage (approx) : sièges réservés / capacité totale des trips concernés
    const activeByTrip = await Booking.aggregate([
      {
        $match: {
          ...match,
          status: { $in: ["PENDING_PAYMENT", "PAID"] },
        },
      },
      { $group: { _id: "$tripId", seatsBooked: { $sum: 1 } } },
    ]);

    const tripIds = activeByTrip.map((x) => x._id);
    const trips = tripIds.length
      ? await Trip.find({ _id: { $in: tripIds } }).select("_id capacity")
      : [];

    const capacityMap = trips.reduce((acc, t) => {
      acc[t._id.toString()] = t.capacity || 0;
      return acc;
    }, {});

    const seatsBooked = activeByTrip.reduce((sum, it) => sum + (it.seatsBooked || 0), 0);
    const totalCapacity = activeByTrip.reduce(
      (sum, it) => sum + (capacityMap[it._id.toString()] || 0),
      0
    );

    const fillRate = totalCapacity > 0 ? Math.round((seatsBooked / totalCapacity) * 100) : 0;

    return res.json({
      range,
      from,
      to,
      kpis: {
        totalBookings,
        pendingPayment,
        paid,
        cancelled,
        used,
        fillRate,
        seatsBooked,
        totalCapacity,
      },
    });
  } catch (err) {
    next(err);
  }
}
