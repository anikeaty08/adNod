import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

// Mongo stores only public/off-chain metadata for browsing and profile history.
// Financial state must stay on-chain only: no budgets, bids, analytics, or earnings belong here.
const CampaignSchema = new Schema(
  {
    chainCampaignId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    creativeURI: { type: String, required: true },
    category: { type: String, required: true },
    pricingModel: { type: String, enum: ["CPC", "CPM"], required: true },
    rate: { type: String, required: true },
    advertiser: { type: String, required: true },
  },
  {
    timestamps: true,
  },
);

CampaignSchema.index({ advertiser: 1, createdAt: -1 });
CampaignSchema.index({ category: 1, createdAt: -1 });

export const CampaignModel = models.Campaign || model("Campaign", CampaignSchema);
