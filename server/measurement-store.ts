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
  settlementId: string;
  sessionId?: string;
  nonce?: string;
  publisherOrigin?: string;
  pageUrlHash?: string;
  billable?: boolean;
  fraudStatus?: "clean" | "review" | "rejected";
  fraudScore?: number;
  fraudReasons?: string[];
  reviewHash?: string;
  counterTxHash?: string;
  countedAt?: string | Date | null;
  meteredAt?: string | Date | null;
  pendingPayoutWei?: string;
  pendingImpressionUnits?: number;
  status: "accepted" | "duplicate" | "settled" | "pending_chain" | "review" | "rejected";
  settlementTxHash?: string;
  lastError?: string;
  settledAt?: string | Date | null;
}

const memoryMeasurements = new Map<string, MeasurementRecord>();

export async function recordMeasurement(payload: Omit<MeasurementRecord, "status">) {
  try {
    await connectDatabase();
    try {
      const created = await MeasurementModel.create({
        ...payload,
        status: payload.billable === false ? (payload.fraudStatus === "rejected" ? "rejected" : "review") : "accepted",
      });
      return { duplicate: false, record: created.toObject() as MeasurementRecord };
    } catch (error) {
      if ((error as { code?: number })?.code !== 11000) throw error;
      const existing = await MeasurementModel.findOne({
        $or: [{ eventKey: payload.eventKey }, { settlementId: payload.settlementId }],
      }).lean();
      return { duplicate: true, record: existing as unknown as MeasurementRecord };
    }
  } catch (error) {
    if (strictModeEnabled()) throw error;
    if (memoryMeasurements.has(payload.eventKey)) {
      return { duplicate: true, record: memoryMeasurements.get(payload.eventKey)! };
    }

    const record: MeasurementRecord = {
      ...payload,
      status: payload.billable === false ? (payload.fraudStatus === "rejected" ? "rejected" : "review") : "accepted",
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
    return (await MeasurementModel.find({ status: { $in: ["accepted", "pending_chain"] }, billable: { $ne: false }, fraudStatus: "clean" })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean()) as unknown as MeasurementRecord[];
  } catch (error) {
    if (strictModeEnabled()) throw error;
    return Array.from(memoryMeasurements.values())
      .filter((item) => (item.status === "accepted" || item.status === "pending_chain") && item.billable !== false && item.fraudStatus !== "review" && item.fraudStatus !== "rejected")
      .slice(0, limit);
  }
}
