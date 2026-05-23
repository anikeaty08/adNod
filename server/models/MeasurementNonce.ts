import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const MeasurementNonceSchema = new Schema(
  {
    nonce: { type: String, required: true },
    sessionId: { type: String, required: true },
    eventType: { type: String, enum: ["impression", "click"], required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  },
);

MeasurementNonceSchema.index({ nonce: 1, eventType: 1 }, { unique: true });
MeasurementNonceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const MeasurementNonceModel = models.MeasurementNonce || model("MeasurementNonce", MeasurementNonceSchema);
