import crypto from "node:crypto";

type MetricKey =
  | "embed_render"
  | "measurement_accept"
  | "measurement_duplicate"
  | "measurement_review"
  | "measurement_reject"
  | "settlement_success"
  | "settlement_failure"
  | "upload_success"
  | "upload_failure"
  | "assistant_usage"
  | "quota_abuse";

const metrics = new Map<MetricKey, number>();

export function requestId() {
  return crypto.randomUUID();
}

export function incrementMetric(key: MetricKey, by = 1) {
  metrics.set(key, (metrics.get(key) ?? 0) + by);
}

export function getMetricsSnapshot() {
  return Object.fromEntries(metrics.entries());
}

export function logInfo(message: string, fields: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ level: "info", message, time: new Date().toISOString(), ...fields }));
}

export function logError(message: string, fields: Record<string, unknown> = {}) {
  console.error(JSON.stringify({ level: "error", message, time: new Date().toISOString(), ...fields }));
}
