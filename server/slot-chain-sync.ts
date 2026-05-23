import { createSlotIfAbsent } from "./slot-store.js";
import { getLastSyncedChainId, setLastSyncedChainId } from "./chain-sync-state.js";
import { getNextSlotId, getSlotPublicInfo } from "./chain-state.js";

const SLOT_SYNC_KEY = "registry:slots";

export async function backfillSlotsFromChain(slots: Array<Record<string, unknown>>) {
  const existing = new Set(slots.map((slot) => String(slot.chainSlotId ?? "")));
  const lastSynced = await getLastSyncedChainId(SLOT_SYNC_KEY);
  const nextSlotId = await getNextSlotId();
  const latest = Number(nextSlotId - 1n);

  for (let id = lastSynced + 1; id <= latest; id += 1) {
    const sid = String(id);
    if (existing.has(sid)) {
      await setLastSyncedChainId(SLOT_SYNC_KEY, id);
      continue;
    }

    {
      const info = await getSlotPublicInfo(sid);
      if (!info.developer || /^0x0{40}$/i.test(info.developer)) {
        throw new Error(`Slot ${sid} was expected on-chain but returned no developer.`);
      }
      const row = await createSlotIfAbsent({
        chainSlotId: sid,
        siteName: info.siteName || `Slot ${sid}`,
        category: info.category || "general",
        siteUrl: "https://publisher.example",
        dailyTrafficEstimate: "0",
        developer: info.developer,
        assignedCampaignId: info.assignedCampaignId === "0" ? "" : info.assignedCampaignId,
      });
      slots.push(row as Record<string, unknown>);
      existing.add(sid);
      await setLastSyncedChainId(SLOT_SYNC_KEY, id);
    }
  }

  return slots;
}
