import { connectDatabase } from "./db.js";
import { SettlementStateModel } from "./models/SettlementState.js";
import { strictModeEnabled } from "./runtime.js";

interface SettlementState {
  chainCampaignId: string;
  chainSlotId: string;
  acceptedImpressions: number;
  settledImpressionUnits: number;
}

const memoryStates = new Map<string, SettlementState>();

function keyFor(campaignId: string, slotId: string) {
  return `${campaignId}:${slotId}`;
}

export async function incrementAcceptedImpression(chainCampaignId: string, chainSlotId: string) {
  try {
    await connectDatabase();
    const next = await SettlementStateModel.findOneAndUpdate(
      { chainCampaignId, chainSlotId },
      { $inc: { acceptedImpressions: 1 } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
    return next as unknown as SettlementState;
  } catch (error) {
    if (strictModeEnabled()) throw error;
    const key = keyFor(chainCampaignId, chainSlotId);
    const current = memoryStates.get(key) ?? {
      chainCampaignId,
      chainSlotId,
      acceptedImpressions: 0,
      settledImpressionUnits: 0,
    };
    const updated = {
      ...current,
      acceptedImpressions: current.acceptedImpressions + 1,
    };
    memoryStates.set(key, updated);
    return updated;
  }
}

export async function markSettledImpressionUnits(chainCampaignId: string, chainSlotId: string, incrementBy: number) {
  try {
    await connectDatabase();
    const next = await SettlementStateModel.findOneAndUpdate(
      { chainCampaignId, chainSlotId },
      { $inc: { settledImpressionUnits: incrementBy } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
    return next as unknown as SettlementState;
  } catch (error) {
    if (strictModeEnabled()) throw error;
    const key = keyFor(chainCampaignId, chainSlotId);
    const current = memoryStates.get(key) ?? {
      chainCampaignId,
      chainSlotId,
      acceptedImpressions: 0,
      settledImpressionUnits: 0,
    };
    const updated = {
      ...current,
      settledImpressionUnits: current.settledImpressionUnits + incrementBy,
    };
    memoryStates.set(key, updated);
    return updated;
  }
}
