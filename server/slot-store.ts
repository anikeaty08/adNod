import { connectDatabase } from "./db.js";
import { SlotModel } from "./models/Slot.js";
import { slotMetadataSchema } from "./validators.js";

const memorySlots: Record<string, unknown>[] = [];
export const slotFields = ["chainSlotId", "siteName", "siteUrl", "category", "dailyTrafficEstimate", "developer", "assignedCampaignId"] as const;

export function sanitizeSlotMetadata(payload: Record<string, unknown>) {
  const parsed = slotMetadataSchema.parse({
    chainSlotId: String(payload.chainSlotId ?? ""),
    siteName: String(payload.siteName ?? ""),
    siteUrl: String(payload.siteUrl ?? ""),
    category: String(payload.category ?? ""),
    dailyTrafficEstimate: String(payload.dailyTrafficEstimate ?? ""),
    developer: String(payload.developer ?? "").toLowerCase(),
    assignedCampaignId: String(payload.assignedCampaignId ?? ""),
  });

  return parsed;
}

export async function getSlots() {
  try {
    await connectDatabase();
    return await SlotModel.find().sort({ createdAt: -1 }).select(slotFields.join(" ")).lean();
  } catch {
    return memorySlots;
  }
}

export async function createSlot(payload: Record<string, unknown>) {
  const sanitized = sanitizeSlotMetadata(payload);

  try {
    await connectDatabase();
    return await SlotModel.findOneAndUpdate({ chainSlotId: sanitized.chainSlotId }, sanitized, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    })
      .select(slotFields.join(" "))
      .lean();
  } catch {
    const localSlot = {
      ...sanitized,
      _id: `local-slot-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    memorySlots.unshift(localSlot);
    return localSlot;
  }
}

export async function assignSlotCampaign(chainSlotId: string, assignedCampaignId: string) {
  try {
    await connectDatabase();
    return await SlotModel.findOneAndUpdate({ chainSlotId }, { assignedCampaignId }, { new: true }).select(slotFields.join(" ")).lean();
  } catch {
    const match = memorySlots.find((slot) => String((slot as { chainSlotId?: string }).chainSlotId ?? "") === chainSlotId) as
      | Record<string, unknown>
      | undefined;

    if (match) {
      match.assignedCampaignId = assignedCampaignId;
      return match;
    }

    return null;
  }
}
