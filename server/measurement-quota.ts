import { connectDatabase } from "./db.js";
import { MeasurementModel } from "./models/Measurement.js";
import { strictModeEnabled } from "./runtime.js";

const memoryBuckets = new Map<string, number[]>();

const DEFAULT_EVENT_LIMIT_PER_MINUTE = 120;

export async function measurementQuotaExceeded(input: {
  chainCampaignId: string;
  chainSlotId: string;
  eventType: "impression" | "click";
}) {
  const limit = Math.max(1, Number(process.env.ADNODE_MEASUREMENT_QUOTA_PER_MINUTE || DEFAULT_EVENT_LIMIT_PER_MINUTE));
  const since = new Date(Date.now() - 60_000);

  try {
    await connectDatabase();
    const count = await MeasurementModel.countDocuments({
      chainCampaignId: input.chainCampaignId,
      chainSlotId: input.chainSlotId,
      eventType: input.eventType,
      createdAt: { $gte: since },
    });
    return count >= limit;
  } catch (error) {
    if (strictModeEnabled()) throw error;
    const key = `${input.chainCampaignId}:${input.chainSlotId}:${input.eventType}`;
    const now = Date.now();
    const recent = (memoryBuckets.get(key) ?? []).filter((time) => now - time < 60_000);
    const exceeded = recent.length >= limit;
    recent.push(now);
    memoryBuckets.set(key, recent);
    return exceeded;
  }
}
