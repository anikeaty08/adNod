import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const AuthNonceSchema = new Schema(
  {
    nonce: { type: String, required: true, unique: true },
    address: { type: String, required: true },
    action: { type: String, required: true },
    chainId: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  },
);

AuthNonceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
AuthNonceSchema.index({ address: 1, action: 1, createdAt: -1 });

export const AuthNonceModel = models.AuthNonce || model("AuthNonce", AuthNonceSchema);
