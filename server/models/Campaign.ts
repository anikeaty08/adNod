import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const CampaignSchema = new Schema(
  {
    chainCampaignId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    creativeURI: { type: String, required: true },
    category: { type: String, required: true },
    advertiser: { type: String, required: true },
  },
  {
    timestamps: true,
  },
);

export const CampaignModel = models.Campaign || model("Campaign", CampaignSchema);
