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
    const from = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));
    const to = endOfDay(now);
    return { from, to };
  }

  if (range === "month") {
    const from = startOfDay(new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000));
    const to = endOfDay(now);
    return { from, to };
  }

  return { from: startOfDay(now), to: endOfDay(now) };
}

export async function getAdminDashboard(req, res, next) {
  try {
    const range = (req.query.range || "today").toString();
    const { from, to } = getRangeDates(range);

    const bookingRangeMatch = { createdAt: { $gte: from, $lte: to } };
    const bookedStatuses = ["PENDING_PAYMENT", "PAID", "USED"];
    const fromDate = dateToYMD(from);
    const toDate = dateToYMD(to);

    const [byStatus, trips] = await Promise.all([
      Booking.aggregate([
        { $match: bookingRangeMatch },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Trip.find({
        date: { $gte: fromDate, $lte: toDate },
        status: "ACTIVE",
      })
        .select("departure destination date departureTime capacity")
        .lean(),
    ]);

    const statusMap = byStatus.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    const totalBookings = byStatus.reduce((sum, item) => sum + item.count, 0);
    const pendingPayment = statusMap.PENDING_PAYMENT || 0;
    const paid = statusMap.PAID || 0;
    const cancelled = statusMap.CANCELLED || 0;
    const used = statusMap.USED || 0;

    const tripIds = trips.map((trip) => trip._id);

    const bookingsByTripAgg = tripIds.length
      ? await Booking.aggregate([
          {
            $match: {
              tripId: { $in: tripIds },
              status: { $in: bookedStatuses },
            },
          },
          {
            $group: {
              _id: "$tripId",
              booked: { $sum: 1 },
            },
          },
        ])
      : [];

    const bookedByTrip = new Map(
      bookingsByTripAgg.map((item) => [String(item._id), item.booked])
    );

    const departures = trips.map((trip) => {
      const booked = bookedByTrip.get(String(trip._id)) || 0;
      const capacity = Number(trip.capacity) || 0;
      const fill = capacity > 0 ? Math.round((booked / capacity) * 100) : 0;

      return {
        _id: trip._id,
        departure: trip.departure,
        destination: trip.destination,
        date: trip.date,
        departureTime: trip.departureTime,
        capacity,
        booked,
        fill,
      };
    });

    const depTotals = departures.reduce(
      (acc, trip) => {
        acc.departuresTotal += 1;
        acc.seatsBooked += trip.booked;
        acc.totalCapacity += trip.capacity;
        return acc;
      },
      { departuresTotal: 0, seatsBooked: 0, totalCapacity: 0 }
    );

    const fillRate =
      depTotals.totalCapacity > 0
        ? Math.round((depTotals.seatsBooked / depTotals.totalCapacity) * 100)
        : 0;

    const topDepartures = [...departures]
      .sort((a, b) => b.fill - a.fill || b.booked - a.booked)
      .slice(0, 8);

    const routesMap = new Map();

    for (const trip of departures) {
      const key = `${trip.departure}__${trip.destination}`;
      const current = routesMap.get(key) || {
        departure: trip.departure,
        destination: trip.destination,
        departuresCount: 0,
        booked: 0,
        capacity: 0,
      };

      current.departuresCount += 1;
      current.booked += trip.booked;
      current.capacity += trip.capacity;
      routesMap.set(key, current);
    }

    const topRoutes = [...routesMap.values()]
      .map((route) => ({
        ...route,
        fill:
          route.capacity > 0
            ? Math.round((route.booked / route.capacity) * 100)
            : 0,
      }))
      .sort((a, b) => b.booked - a.booked || b.fill - a.fill)
      .slice(0, 6);

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
