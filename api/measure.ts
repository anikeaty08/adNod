import type { IncomingMessage, ServerResponse } from "node:http";
import "dotenv/config";
import { buildMeasurementEventKey, buildMeasurementFingerprint, verifyMeasurementToken } from "../server/measurement.js";
import { recordMeasurement } from "../server/measurement-store.js";
import { getPublicCampaignBySlotId } from "../server/public-campaigns.js";
import { markMeasurementPending, syncMeasurementToChain } from "../server/settlement-service.js";
import { readJsonBody } from "../server/http-body.js";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Invalid request body." }));
    return;
  }
  const token = String(body.token ?? "");
  const eventType = String(body.eventType ?? "");
  const pageUrl = String(body.pageUrl ?? "");
  const referrer = String(body.referrer ?? "");

  if (!token || (eventType !== "impression" && eventType !== "click")) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "token and valid eventType are required." }));
    return;
  }

  let verifiedToken;
  try {
    verifiedToken = verifyMeasurementToken(token);
  } catch (error) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Invalid measurement token." }));
    return;
  }

  let campaign;
  try {
    campaign = await getPublicCampaignBySlotId(Number(verifiedToken.chainSlotId));
  } catch (error) {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Assigned campaign not found." }));
    return;
  }

  if (campaign.id !== verifiedToken.chainCampaignId) {
    res.statusCode = 409;
    res.end(JSON.stringify({ error: "Embed token campaign assignment no longer matches slot state." }));
    return;
  }

  const remoteAddress = String(req.socket.remoteAddress ?? "");
  const userAgent = Array.isArray(req.headers["user-agent"]) ? req.headers["user-agent"][0] ?? "" : String(req.headers["user-agent"] ?? "");
  const fingerprint = buildMeasurementFingerprint({
    remoteAddress,
    userAgent,
    eventType,
    campaignId: String(campaign.id),
    slotId: String(campaign.slotId),
  });
  const eventKey = buildMeasurementEventKey({
    chainCampaignId: campaign.id,
    chainSlotId: campaign.slotId,
    eventType,
    fingerprint,
  });

  const { duplicate, record } = await recordMeasurement({
    eventKey,
    chainCampaignId: campaign.id,
    chainSlotId: campaign.slotId,
    eventType,
    pricingModel: campaign.pricingModel,
    rate: campaign.rate,
    pageUrl,
    referrer,
    fingerprint,
  });

  if (duplicate) {
    res.statusCode = 202;
    res.end(JSON.stringify({ ok: true, duplicate: true }));
    return;
  }

  try {
    const result = await syncMeasurementToChain(record);
    res.statusCode = 202;
    res.end(JSON.stringify({ ok: true, duplicate: false, settlement: result }));
  } catch (error) {
    await markMeasurementPending(record, error);
    res.statusCode = 202;
    res.end(JSON.stringify({
      ok: true,
      duplicate: false,
      settlement: { status: "pending_chain" },
      warning: error instanceof Error ? error.message : "Chain sync failed.",
    }));
  }
}
