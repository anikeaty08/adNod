import { connectDatabase } from "./db.js";
import { SlotModel } from "./models/Slot.js";
import { slotMetadataSchema } from "./validators.js";
import { strictModeEnabled } from "./runtime.js";
import { randomBytes } from "node:crypto";

const memorySlots: Record<string, unknown>[] = [];
export const slotFields = ["chainSlotId", "slotKey", "siteName", "siteUrl", "category", "dailyTrafficEstimate", "developer", "assignedCampaignId"] as const;

function generateSlotKey(): string {
  return `slot_${randomBytes(12).toString("base64url")}`;
}

export function sanitizeSlotMetadata(payload: Record<string, unknown>) {
  const parsed = slotMetadataSchema.parse({
    chainSlotId: String(payload.chainSlotId ?? ""),
    slotKey: payload.slotKey ? String(payload.slotKey) : undefined,
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
    const rows = (await SlotModel.find().sort({ createdAt: -1 }).select(slotFields.join(" ")).lean()) as Array<Record<string, unknown>>;

    // Best-effort: older rows might not have slotKey yet. Backfill once so embeds can use an unguessable identifier.
    const missing = rows.filter((r) => !r.slotKey && typeof r.chainSlotId === "string");
    if (missing.length) {
      await Promise.all(
        missing.slice(0, 25).map(async (row) => {
          const chainSlotId = String(row.chainSlotId);
          const key = generateSlotKey();
          try {
            await SlotModel.updateOne({ chainSlotId, slotKey: { $in: [null, ""] } }, { $set: { slotKey: key } });
            row.slotKey = key;
          } catch {
            // ignore
          }
        }),
      );
    }

    return rows;
  } catch (error) {
    if (strictModeEnabled()) throw error;
    return memorySlots;
  }
}

export async function getSlotByChainId(chainSlotId: string) {
  try {
    await connectDatabase();
    return await SlotModel.findOne({ chainSlotId }).select(slotFields.join(" ")).lean();
  } catch (error) {
    if (strictModeEnabled()) throw error;
    return (
      (memorySlots.find((slot) => String((slot as { chainSlotId?: string }).chainSlotId ?? "") === chainSlotId) as Record<string, unknown> | undefined) ??
      null
    );
  }
}

export async function getSlotByKey(slotKey: string) {
  try {
    await connectDatabase();
    return await SlotModel.findOne({ slotKey }).select(slotFields.join(" ")).lean();
  } catch (error) {
    if (strictModeEnabled()) throw error;
    return ((memorySlots.find((slot) => String((slot as { slotKey?: string }).slotKey ?? "") === slotKey) as Record<string, unknown> | undefined) ?? null);
  }
}

export async function createSlot(payload: Record<string, unknown>) {
  const sanitized = sanitizeSlotMetadata(payload);
  const update = { ...sanitized } as Record<string, unknown>;
  if (!sanitized.slotKey) delete update.slotKey;

  try {
    await connectDatabase();
    return await SlotModel.findOneAndUpdate({ chainSlotId: sanitized.chainSlotId }, update, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    })
      .select(slotFields.join(" "))
      .lean();
  } catch (error) {
    if (strictModeEnabled()) throw error;
    const localSlot = {
      ...sanitized,
      _id: `local-slot-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    memorySlots.unshift(localSlot);
    return localSlot;
  }
}

/** Create-once helper for unsigned tx-indexing endpoints (prevents public overwrites). */
export async function createSlotIfAbsent(payload: Record<string, unknown>) {
  const sanitized = sanitizeSlotMetadata({
    slotKey: payload.slotKey || generateSlotKey(),
    ...payload,
  });

  try {
    await connectDatabase();
    return await SlotModel.findOneAndUpdate(
      { chainSlotId: sanitized.chainSlotId },
      { $setOnInsert: sanitized },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    )
      .select(slotFields.join(" "))
      .lean();
  } catch (error) {
    if (strictModeEnabled()) throw error;
    const existing = memorySlots.find((slot) => String((slot as { chainSlotId?: string }).chainSlotId ?? "") === sanitized.chainSlotId) as
      | Record<string, unknown>
      | undefined;
    if (existing) return existing;
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
  } catch (error) {
    if (strictModeEnabled()) throw error;
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
