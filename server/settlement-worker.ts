import { replayPendingMeasurements } from "./settlement-service.js";

let settlementWorkerStarted = false;

export function startSettlementReplayWorker() {
  if (settlementWorkerStarted) return;
  if (process.env.ADNODE_SETTLEMENT_WORKER_ENABLED?.toLowerCase() === "false") return;

  settlementWorkerStarted = true;
  const intervalMs = Math.max(15_000, Number(process.env.ADNODE_SETTLEMENT_REPLAY_INTERVAL_MS || 60_000));

  setInterval(() => {
    void replayPendingMeasurements().catch((error) => {
      console.error("AdNode settlement replay failed:", error instanceof Error ? error.message : error);
    });
  }, intervalMs);
}
