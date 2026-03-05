import mongoose from "mongoose";
import { z } from "zod";
import { Bus } from "../models/Bus.js";

const createBusSchema = z.object({
  name: z.string().trim().min(2, "Nom requis"),
  departurePoint: z.string().trim().min(2, "Point de départ requis"),
  seats: z.number().int().min(1, "Nombre de places invalide"),
  plateNumber: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

const updateBusSchema = z.object({
  name: z.string().trim().min(2).optional(),
  departurePoint: z.string().trim().min(2).optional(),
  seats: z.number().int().min(1).optional(),
  plateNumber: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export async function listBuses(req, res, next) {
  try {
    const { q = "", status } = req.query;

    const filter = {};
    if (q) {
      const rx = { $regex: String(q).trim(), $options: "i" };
      filter.$or = [{ name: rx }, { departurePoint: rx }, { plateNumber: rx }];
    }
    if (status && ["ACTIVE", "INACTIVE"].includes(status)) filter.status = status;

    const buses = await Bus.find(filter).sort({ createdAt: -1 });
    return res.json({ buses });
  } catch (err) {
    return next(err);
  }
}

export async function getBus(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "ID invalide" });

    const bus = await Bus.findById(id);
    if (!bus) return res.status(404).json({ message: "Bus introuvable" });

    return res.json({ bus });
  } catch (err) {
    return next(err);
  }
}

export async function createBus(req, res, next) {
  try {
    // seats peut arriver en string si form => cast côté backend
    const body = { ...req.body };
    if (typeof body.seats === "string") body.seats = Number(body.seats);

    const parsed = createBusSchema.safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation error", errors: parsed.error.flatten() });
    }

    const { name, departurePoint, seats, plateNumber = "", status = "ACTIVE" } = parsed.data;

    const bus = await Bus.create({
      name,
      departurePoint,
      seats,
      plateNumber,
      status,
    });

    return res.status(201).json({ bus });
  } catch (err) {
    return next(err);
  }
}

export async function updateBus(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "ID invalide" });

    const body = { ...req.body };
    if (typeof body.seats === "string") body.seats = Number(body.seats);

    const parsed = updateBusSchema.safeParse(body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation error", errors: parsed.error.flatten() });
    }

    const bus = await Bus.findByIdAndUpdate(id, parsed.data, { new: true });
    if (!bus) return res.status(404).json({ message: "Bus introuvable" });

    return res.json({ bus });
  } catch (err) {
    return next(err);
  }
}

export async function deleteBus(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "ID invalide" });

    const bus = await Bus.findByIdAndDelete(id);
    if (!bus) return res.status(404).json({ message: "Bus introuvable" });

    return res.json({ message: "Bus supprimé" });
  } catch (err) {
    return next(err);
  }
}
