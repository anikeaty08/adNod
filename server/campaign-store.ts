import { connectDatabase } from "./db";
import { CampaignModel } from "./models/Campaign";

const memoryCampaigns: Record<string, unknown>[] = [];

export async function getCampaigns() {
  try {
    await connectDatabase();
    return await CampaignModel.find().sort({ createdAt: -1 }).lean();
  } catch {
    return memoryCampaigns;
  }
}

export async function createCampaign(payload: Record<string, unknown>) {
  try {
    await connectDatabase();
    return await CampaignModel.create(payload);
  } catch {
    const localCampaign = {
      ...payload,
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
