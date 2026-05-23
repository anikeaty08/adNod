import "dotenv/config";
import { assertRuntimeSafety } from "../server/runtime.js";
import { startSettlementReplayWorker } from "../server/settlement-worker.js";

assertRuntimeSafety();
startSettlementReplayWorker();

console.log("AdNode settlement worker started.");
