import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const ChainSyncStateSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    lastSyncedId: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: true,
  },
);

export const ChainSyncStateModel = models.ChainSyncState || model("ChainSyncState", ChainSyncStateSchema);
