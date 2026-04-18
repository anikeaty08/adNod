import { connectDatabase } from "./db.js";
import { MeasurementModel } from "./models/Measurement.js";
import { strictModeEnabled } from "./runtime.js";

export interface MeasurementRecord {
  eventKey: string;
  chainCampaignId: string;
  chainSlotId: string;
  eventType: "impression" | "click";
  pricingModel: "CPC" | "CPM";
  rate: string;
  pageUrl: string;
  referrer: string;
  fingerprint: string;
  status: "accepted" | "duplicate" | "settled" | "pending_chain";
  settlementTxHash?: string;
  lastError?: string;
  settledAt?: string | Date | null;
}

const memoryMeasurements = new Map<string, MeasurementRecord>();

export async function recordMeasurement(payload: Omit<MeasurementRecord, "status">) {
  try {
    await connectDatabase();
    const existing = await MeasurementModel.findOne({ eventKey: payload.eventKey }).lean();
    if (existing) {
      return { duplicate: true, record: existing as unknown as MeasurementRecord };
    }

    const created = await MeasurementModel.create({
      ...payload,
      status: "accepted",
    });
    return { duplicate: false, record: created.toObject() as MeasurementRecord };
  } catch (error) {
    if (strictModeEnabled()) throw error;
    if (memoryMeasurements.has(payload.eventKey)) {
      return { duplicate: true, record: memoryMeasurements.get(payload.eventKey)! };
    }

    const record: MeasurementRecord = {
      ...payload,
      status: "accepted",
      settlementTxHash: "",
      lastError: "",
      settledAt: null,
    };
    memoryMeasurements.set(payload.eventKey, record);
    return { duplicate: false, record };
  }
}

export async function updateMeasurementStatus(eventKey: string, updates: Partial<MeasurementRecord>) {
  try {
    await connectDatabase();
    return await MeasurementModel.findOneAndUpdate({ eventKey }, updates, { new: true }).lean();
  } catch (error) {
    if (strictModeEnabled()) throw error;
    const existing = memoryMeasurements.get(eventKey);
    if (!existing) {
      return null;
    }

    const updated = { ...existing, ...updates };
    memoryMeasurements.set(eventKey, updated);
    return updated;
  }
}

export async function listPendingMeasurements(limit = 50) {
  try {
    await connectDatabase();
    return (await MeasurementModel.find({ status: { $in: ["accepted", "pending_chain"] } })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean()) as unknown as MeasurementRecord[];
  } catch (error) {
    if (strictModeEnabled()) throw error;
    return Array.from(memoryMeasurements.values())
      .filter((item) => item.status === "accepted" || item.status === "pending_chain")
      .slice(0, limit);
  }
}
