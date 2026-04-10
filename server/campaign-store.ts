import { connectDatabase } from "./db.js";
import { CampaignModel } from "./models/Campaign.js";
import { campaignMetadataSchema } from "./validators.js";

const memoryCampaigns: Record<string, unknown>[] = [];
export const metadataFields = ["chainCampaignId", "title", "description", "creativeURI", "category", "pricingModel", "rate", "advertiser"] as const;

export function sanitizeCampaignMetadata(payload: Record<string, unknown>) {
  const parsed = campaignMetadataSchema.parse({
    chainCampaignId: String(payload.chainCampaignId ?? ""),
    title: String(payload.title ?? ""),
    description: String(payload.description ?? ""),
    creativeURI: String(payload.creativeURI ?? ""),
    category: String(payload.category ?? ""),
    pricingModel: String(payload.pricingModel ?? "CPC"),
    rate: String(payload.rate ?? ""),
    advertiser: String(payload.advertiser ?? "").toLowerCase(),
  });

  return parsed;
}

export async function getCampaigns() {
  try {
    await connectDatabase();
    return await CampaignModel.find().sort({ createdAt: -1 }).select(metadataFields.join(" ")).lean();
  } catch {
    return memoryCampaigns;
  }
}

export async function createCampaign(payload: Record<string, unknown>) {
  const sanitized = sanitizeCampaignMetadata(payload);

  try {
    await connectDatabase();
    return await CampaignModel.findOneAndUpdate({ chainCampaignId: sanitized.chainCampaignId }, sanitized, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    })
      .select(metadataFields.join(" "))
      .lean();
  } catch {
    const localCampaign = {
      ...sanitized,
      _id: `local-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    memoryCampaigns.unshift(localCampaign);
    return localCampaign;
  }
}

export async function getDatabaseReady() {
  try {
    await connectDatabase();
    return true;
  } catch {
    return false;
  }
}
