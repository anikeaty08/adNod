import { connectDatabase } from "./db.js";
import { ChainSyncStateModel } from "./models/ChainSyncState.js";
import { strictModeEnabled } from "./runtime.js";

const memoryState = new Map<string, number>();

export async function getLastSyncedChainId(key: string) {
  try {
    await connectDatabase();
    const row = await ChainSyncStateModel.findOne({ key }).lean();
    return Number((row as { lastSyncedId?: number } | null)?.lastSyncedId ?? 0);
  } catch (error) {
    if (strictModeEnabled()) throw error;
    return memoryState.get(key) ?? 0;
  }
}

export async function setLastSyncedChainId(key: string, lastSyncedId: number) {
  try {
    await connectDatabase();
    await ChainSyncStateModel.findOneAndUpdate({ key }, { lastSyncedId }, { upsert: true, new: true, setDefaultsOnInsert: true });
  } catch (error) {
    if (strictModeEnabled()) throw error;
    memoryState.set(key, lastSyncedId);
  }
}
