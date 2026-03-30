import { Schema, model, models } from "mongoose";

const CampaignSchema = new Schema(
  {
    chainCampaignId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    creativeUrl: { type: String, required: true },
    pricingModel: { type: String, enum: ["CPC", "CPM", "HYBRID"], required: true },
    budget: { type: Number, required: true },
    escrowedMas: { type: Number, required: true },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "paused", "completed"], default: "active" },
    advertiser: { type: String, required: true },
  },
  {
    timestamps: true,
  },
);

export const CampaignModel = models.Campaign || model("Campaign", CampaignSchema);
