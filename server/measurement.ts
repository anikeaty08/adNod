import crypto from "node:crypto";

const TOKEN_TTL_MS = 6 * 60 * 60 * 1000;

interface MeasurementTokenPayload {
  chainCampaignId: string;
  chainSlotId: string;
  issuedAt: number;
  expiresAt: number;
}

function readSecret() {
  const secret = process.env.ADNODE_EMBED_SECRET;
  if (!secret) {
    throw new Error("ADNODE_EMBED_SECRET is required for secure embed measurement.");
  }
  return secret;
}

function encodePayload(payload: MeasurementTokenPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function sign(value: string) {
  return crypto.createHmac("sha256", readSecret()).update(value).digest("base64url");
}

export function createMeasurementToken(payload: Omit<MeasurementTokenPayload, "issuedAt" | "expiresAt">) {
  const fullPayload: MeasurementTokenPayload = {
    ...payload,
    issuedAt: Date.now(),
    expiresAt: Date.now() + TOKEN_TTL_MS,
  };
  const encoded = encodePayload(fullPayload);
  return `${encoded}.${sign(encoded)}`;
}

export function verifyMeasurementToken(token: string) {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature || sign(encoded) !== signature) {
    throw new Error("Invalid measurement token.");
  }

  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as MeasurementTokenPayload;
  if (payload.expiresAt < Date.now()) {
    throw new Error("Measurement token expired.");
  }

  return payload;
}

export function buildMeasurementFingerprint(input: {
  remoteAddress: string;
  userAgent: string;
  eventType: string;
  campaignId: string;
  slotId: string;
}) {
  return crypto
    .createHash("sha256")
    .update(`${input.remoteAddress}|${input.userAgent}|${input.eventType}|${input.campaignId}|${input.slotId}`)
    .digest("hex");
}

export function buildMeasurementEventKey(input: {
  chainCampaignId: string;
  chainSlotId: string;
  eventType: "impression" | "click";
  fingerprint: string;
}) {
  const tenMinuteBucket = Math.floor(Date.now() / (10 * 60 * 1000));
  return `${input.chainCampaignId}:${input.chainSlotId}:${input.eventType}:${tenMinuteBucket}:${input.fingerprint}`;
}
