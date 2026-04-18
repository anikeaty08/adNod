import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const SlotSchema = new Schema(
  {
    chainSlotId: { type: String, required: true, unique: true },
    slotKey: { type: String, unique: true, sparse: true },
    siteName: { type: String, required: true },
    siteUrl: { type: String, required: true },
    category: { type: String, required: true },
    dailyTrafficEstimate: { type: String, required: true },
    developer: { type: String, required: true },
    assignedCampaignId: { type: String, default: "" },
  },
  {
    timestamps: true,
  },
);

export const SlotModel = models.Slot || model("Slot", SlotSchema);
