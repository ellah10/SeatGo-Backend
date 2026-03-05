import { Booking } from "../models/Booking.js";
import { Trip } from "../models/Trip.js";

function dateToYMD(d) {
  const x = new Date(d);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

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

    // -----------------------------
    // Statistiques enrichies (réelles par départ)
    // - basées sur les départs (Trip.date) qui tombent dans la période
    // - et les réservations liées à ces trips
    // -----------------------------
    const fromDate = dateToYMD(from);
    const toDate = dateToYMD(to);

    const tripMatch = {
      date: { $gte: fromDate, $lte: toDate },
      status: "ACTIVE",
    };

    const bookedStatuses = ["PENDING_PAYMENT", "PAID", "USED"];

    // Fill rate global sur les départs de la période (plus "réel" que par createdAt)
    const fillAgg = await Trip.aggregate([
      { $match: tripMatch },
      {
        $lookup: {
          from: "bookings",
          let: { tid: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$tripId", "$$tid"] },
                status: { $in: bookedStatuses },
              },
            },
            { $count: "cnt" },
          ],
          as: "bk",
        },
      },
      {
        $addFields: {
          booked: { $ifNull: [{ $arrayElemAt: ["$bk.cnt", 0] }, 0] },
        },
      },
      {
        $group: {
          _id: null,
          departuresTotal: { $sum: 1 },
          seatsBooked: { $sum: "$booked" },
          totalCapacity: { $sum: "$capacity" },
        },
      },
    ]);

    const depTotals = fillAgg?.[0] || {
      departuresTotal: 0,
      seatsBooked: 0,
      totalCapacity: 0,
    };
    const fillRate =
      depTotals.totalCapacity > 0
        ? Math.round((depTotals.seatsBooked / depTotals.totalCapacity) * 100)
        : 0;

    // Top départs par taux de remplissage (dans la période)
    const topDepartures = await Trip.aggregate([
      { $match: tripMatch },
      {
        $lookup: {
          from: "bookings",
          let: { tid: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$tripId", "$$tid"] },
                status: { $in: bookedStatuses },
              },
            },
            { $count: "cnt" },
          ],
          as: "bk",
        },
      },
      {
        $addFields: {
          booked: { $ifNull: [{ $arrayElemAt: ["$bk.cnt", 0] }, 0] },
          fill: {
            $cond: [
              { $gt: ["$capacity", 0] },
              { $round: [{ $multiply: [{ $divide: ["$booked", "$capacity"] }, 100] }, 0] },
              0,
            ],
          },
        },
      },
      {
        $project: {
          _id: 1,
          departure: 1,
          destination: 1,
          date: 1,
          departureTime: 1,
          capacity: 1,
          booked: 1,
          fill: 1,
        },
      },
      { $sort: { fill: -1, booked: -1 } },
      { $limit: 8 },
    ]);

    // Top trajets (routes) : somme des réservations sur les départs de la période
    const topRoutes = await Trip.aggregate([
      { $match: tripMatch },
      {
        $lookup: {
          from: "bookings",
          let: { tid: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$tripId", "$$tid"] },
                status: { $in: bookedStatuses },
              },
            },
            { $count: "cnt" },
          ],
          as: "bk",
        },
      },
      {
        $addFields: {
          booked: { $ifNull: [{ $arrayElemAt: ["$bk.cnt", 0] }, 0] },
        },
      },
      {
        $group: {
          _id: {
            departure: "$departure",
            destination: "$destination",
          },
          departuresCount: { $sum: 1 },
          booked: { $sum: "$booked" },
          capacity: { $sum: "$capacity" },
        },
      },
      {
        $addFields: {
          fill: {
            $cond: [
              { $gt: ["$capacity", 0] },
              { $round: [{ $multiply: [{ $divide: ["$booked", "$capacity"] }, 100] }, 0] },
              0,
            ],
          },
        },
      },
      {
        $project: {
          _id: 0,
          departure: "$_id.departure",
          destination: "$_id.destination",
          departuresCount: 1,
          booked: 1,
          capacity: 1,
          fill: 1,
        },
      },
      { $sort: { booked: -1, fill: -1 } },
      { $limit: 6 },
    ]);

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
        seatsBooked: depTotals.seatsBooked,
        totalCapacity: depTotals.totalCapacity,
      },
      insights: {
        departures: {
          fromDate,
          toDate,
          departuresTotal: depTotals.departuresTotal,
          seatsBooked: depTotals.seatsBooked,
          totalCapacity: depTotals.totalCapacity,
          fillRate,
        },
        topRoutes,
        topDepartures,
      },
    });
  } catch (err) {
    next(err);
  }
}
