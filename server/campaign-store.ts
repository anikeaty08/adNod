import { connectDatabase } from "./db.js";
import { CampaignModel } from "./models/Campaign.js";
import { campaignMetadataSchema } from "./validators.js";
import { strictModeEnabled } from "./runtime.js";

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
  } catch (error) {
    if (strictModeEnabled()) throw error;
    return memoryCampaigns;
  }
}

export async function getCampaignByChainId(chainCampaignId: string) {
  const id = String(chainCampaignId ?? "").trim();
  if (!id) return null;
  try {
    await connectDatabase();
    return await CampaignModel.findOne({ chainCampaignId: id })
      .select([...metadataFields, "createdAt"].join(" "))
      .lean();
  } catch (error) {
    if (strictModeEnabled()) throw error;
    return (memoryCampaigns as Array<Record<string, unknown>>).find((c) => String(c.chainCampaignId) === id) ?? null;
  }
}

export async function createCampaignIfAbsent(payload: Record<string, unknown>) {
  const sanitized = sanitizeCampaignMetadata(payload);

  try {
    await connectDatabase();
    const existing = await CampaignModel.findOne({ chainCampaignId: sanitized.chainCampaignId })
      .select(metadataFields.join(" "))
      .lean();
    if (existing) return existing;

    return await CampaignModel.create(sanitized).then((doc) => {
      const row = doc.toObject() as Record<string, unknown>;
      const picked: Record<string, unknown> = {};
      for (const k of metadataFields) picked[k] = row[k];
      return picked;
    });
  } catch (error) {
    if (strictModeEnabled()) throw error;
    const existing = (memoryCampaigns as Array<Record<string, unknown>>).find(
      (c) => String(c.chainCampaignId) === sanitized.chainCampaignId,
    );
    if (existing) return existing;
    const localCampaign = {
      ...sanitized,
      _id: `local-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    memoryCampaigns.unshift(localCampaign);
    return localCampaign;
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
  } catch (error) {
    if (strictModeEnabled()) throw error;
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
