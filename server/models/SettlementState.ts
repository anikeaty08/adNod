import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const SettlementStateSchema = new Schema(
  {
    chainCampaignId: { type: String, required: true },
    chainSlotId: { type: String, required: true },
    acceptedImpressions: { type: Number, required: true, default: 0 },
    settledImpressionUnits: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: true,
  },
);

SettlementStateSchema.index({ chainCampaignId: 1, chainSlotId: 1 }, { unique: true });

export const SettlementStateModel = models.SettlementState || model("SettlementState", SettlementStateSchema);
