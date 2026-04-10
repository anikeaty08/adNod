import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const MeasurementSchema = new Schema(
  {
    eventKey: { type: String, required: true, unique: true },
    chainCampaignId: { type: String, required: true },
    chainSlotId: { type: String, required: true },
    eventType: { type: String, enum: ["impression", "click"], required: true },
    pricingModel: { type: String, enum: ["CPC", "CPM"], required: true },
    rate: { type: String, required: true },
    pageUrl: { type: String, default: "" },
    referrer: { type: String, default: "" },
    fingerprint: { type: String, required: true },
    status: { type: String, enum: ["accepted", "duplicate", "settled", "pending_chain"], default: "accepted" },
    settlementTxHash: { type: String, default: "" },
    lastError: { type: String, default: "" },
    settledAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

export const MeasurementModel = models.Measurement || model("Measurement", MeasurementSchema);
