import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    bookingCode: { type: String, required: true, unique: true },

    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: "Trip", required: true },

    seatNumber: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["PENDING_PAYMENT", "PAID", "CANCELLED", "USED"],
      default: "PAID",
    },

    payment: {
      method: { type: String, enum: ["flooz", "tmoney"], required: true },
      phone: { type: String, default: "" },
      reference: { type: String, default: "" },
      paidAt: { type: Date, default: Date.now },
    },
  },
  { timestamps: true }
);

bookingSchema.index(
  { tripId: 1, seatNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["PENDING_PAYMENT", "PAID"] } },
  }
);
bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ userId: 1, status: 1 });
bookingSchema.index({ tripId: 1, status: 1 });
bookingSchema.index({ createdAt: 1, status: 1 });

export const Booking = mongoose.model("Booking", bookingSchema);
