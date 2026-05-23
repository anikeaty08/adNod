import { AuthNonceModel } from "./models/AuthNonce.js";
import { CampaignModel } from "./models/Campaign.js";
import { ChainSyncStateModel } from "./models/ChainSyncState.js";
import { MeasurementModel } from "./models/Measurement.js";
import { MeasurementNonceModel } from "./models/MeasurementNonce.js";
import { SettlementStateModel } from "./models/SettlementState.js";
import { SlotModel } from "./models/Slot.js";
import { UploadUsageModel } from "./models/UploadUsage.js";
import { connectDatabase } from "./db.js";

export async function ensureDatabaseIndexes() {
  await connectDatabase();
  await Promise.all([
    AuthNonceModel.createIndexes(),
    CampaignModel.createIndexes(),
    ChainSyncStateModel.createIndexes(),
    MeasurementModel.createIndexes(),
    MeasurementNonceModel.createIndexes(),
    SettlementStateModel.createIndexes(),
    SlotModel.createIndexes(),
    UploadUsageModel.createIndexes(),
  ]);
}
