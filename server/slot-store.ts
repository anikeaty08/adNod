import { connectDatabase } from "./db.js";
import { SlotModel } from "./models/Slot.js";

const memorySlots: Record<string, unknown>[] = [];
const slotFields = ["chainSlotId", "siteName", "siteUrl", "category", "dailyTrafficEstimate", "developer", "assignedCampaignId"] as const;

export function sanitizeSlotMetadata(payload: Record<string, unknown>) {
  return slotFields.reduce<Record<string, unknown>>((accumulator, field) => {
    accumulator[field] = String(payload[field] ?? "");
    return accumulator;
  }, {});
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
    return await SlotModel.create(sanitized);
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
