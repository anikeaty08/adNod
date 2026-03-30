import { connectDatabase } from "./db";
import { CampaignModel } from "./models/Campaign";

const memoryCampaigns: Record<string, unknown>[] = [];
const metadataFields = ["chainCampaignId", "title", "description", "creativeURI", "category", "advertiser"] as const;

export function sanitizeCampaignMetadata(payload: Record<string, unknown>) {
  return metadataFields.reduce<Record<string, unknown>>((accumulator, field) => {
    accumulator[field] = String(payload[field] ?? "");
    return accumulator;
  }, {});
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
    return await CampaignModel.create(sanitized);
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
