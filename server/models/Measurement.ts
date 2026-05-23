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
    settlementId: { type: String, required: true },
    sessionId: { type: String, default: "" },
    nonce: { type: String, default: "" },
    publisherOrigin: { type: String, default: "" },
    pageUrlHash: { type: String, default: "" },
    billable: { type: Boolean, default: true },
    fraudStatus: { type: String, enum: ["clean", "review", "rejected"], default: "clean" },
    fraudScore: { type: Number, default: 0 },
    fraudReasons: { type: [String], default: [] },
    reviewHash: { type: String, default: "" },
    counterTxHash: { type: String, default: "" },
    countedAt: { type: Date, default: null },
    meteredAt: { type: Date, default: null },
    pendingPayoutWei: { type: String, default: "0" },
    pendingImpressionUnits: { type: Number, default: 0 },
    status: { type: String, enum: ["accepted", "duplicate", "settled", "pending_chain", "review", "rejected"], default: "accepted" },
    settlementTxHash: { type: String, default: "" },
    lastError: { type: String, default: "" },
    settledAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

MeasurementSchema.index({ chainCampaignId: 1, chainSlotId: 1, eventType: 1, settlementId: 1 }, { unique: true });
MeasurementSchema.index({ status: 1, createdAt: 1 });
MeasurementSchema.index({ billable: 1, fraudStatus: 1, status: 1, createdAt: 1 });
MeasurementSchema.index({ chainCampaignId: 1, chainSlotId: 1, eventType: 1, createdAt: 1 });

export const MeasurementModel = models.Measurement || model("Measurement", MeasurementSchema);
