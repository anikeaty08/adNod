import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const UploadUsageSchema = new Schema(
  {
    address: { type: String, required: true },
    size: { type: Number, required: true },
    mimeType: { type: String, required: true },
  },
  {
    timestamps: true,
  },
);

UploadUsageSchema.index({ address: 1, createdAt: -1 });

export const UploadUsageModel = models.UploadUsage || model("UploadUsage", UploadUsageSchema);
