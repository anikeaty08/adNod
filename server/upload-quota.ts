import { connectDatabase } from "./db.js";
import { UploadUsageModel } from "./models/UploadUsage.js";
import { strictModeEnabled } from "./runtime.js";

const memoryUploads = new Map<string, Array<{ time: number; size: number }>>();

export async function assertCreativeUploadQuota(address: string, size: number, mimeType: string) {
  const maxUploads = Math.max(1, Number(process.env.ADNODE_UPLOADS_PER_DAY || 25));
  const maxBytes = Math.max(1, Number(process.env.ADNODE_UPLOAD_BYTES_PER_DAY || 100 * 1024 * 1024));
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    await connectDatabase();
    const rows = (await UploadUsageModel.find({ address: address.toLowerCase(), createdAt: { $gte: since } }).select("size").lean()) as Array<{ size?: number }>;
    const bytes = rows.reduce((sum, row) => sum + Number(row.size ?? 0), 0);
    if (rows.length >= maxUploads || bytes + size > maxBytes) {
      throw new Error("Creative upload quota exceeded.");
    }
    await UploadUsageModel.create({ address: address.toLowerCase(), size, mimeType });
  } catch (error) {
    if (error instanceof Error && error.message === "Creative upload quota exceeded.") throw error;
    if (strictModeEnabled()) throw error;
    const now = Date.now();
    const key = address.toLowerCase();
    const rows = (memoryUploads.get(key) ?? []).filter((row) => now - row.time < 24 * 60 * 60 * 1000);
    const bytes = rows.reduce((sum, row) => sum + row.size, 0);
    if (rows.length >= maxUploads || bytes + size > maxBytes) {
      throw new Error("Creative upload quota exceeded.");
    }
    rows.push({ time: now, size });
    memoryUploads.set(key, rows);
  }
}
