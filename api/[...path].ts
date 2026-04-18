import type { IncomingMessage, ServerResponse } from "node:http";
import "dotenv/config";
import { getCampaignByChainId, getCampaigns, createCampaign, createCampaignIfAbsent, sanitizeCampaignMetadata } from "../server/campaign-store.js";
import { getSlots, createSlot, sanitizeSlotMetadata, assignSlotCampaign } from "../server/slot-store.js";
import { getDatabaseReady } from "../server/campaign-store.js";
import { getRegistryChainHealth, getCampaignHoster, getSlotDeveloper, getAssignedCampaignId, getNextCampaignId, getCampaignPublicInfo, getCampaignSettlementTerms } from "../server/chain-state.js";
import { assertSignedRequest } from "../server/request-auth.js";
import { readJsonBody } from "../server/http-body.js";
import { parseMultipartUpload, uploadBufferToPinata } from "../server/pinata.js";
import { getAssistantReply, type AssistantMessage } from "../server/assistant.js";
import { getPublicCampaignById, getPublicCampaignBySlotId, createEmbedFramePayload, buildEmbedFrameHtml, buildEmbedScript } from "../server/public-campaigns.js";
import { verifyMeasurementToken, buildMeasurementFingerprint, buildMeasurementEventKey } from "../server/measurement.js";
import { recordMeasurement } from "../server/measurement-store.js";
import { markMeasurementPending, syncMeasurementToChain, replayPendingMeasurements } from "../server/settlement-service.js";
import { formatEther } from "viem";

function getUrl(req: IncomingMessage) {
  const host = req.headers.host || "localhost";
  const proto = (req.headers["x-forwarded-proto"] as string | undefined) || "https";
  return new URL(req.url || "/", `${proto}://${host}`);
}

function getPathname(req: IncomingMessage) {
  const url = getUrl(req);
  const p = url.pathname || "/";
  return p.startsWith("/api/") ? p.slice("/api".length) : p;
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  res.setHeader("Content-Type", "application/json");
  res.statusCode = status;
  res.end(JSON.stringify(payload));
}

function methodNotAllowed(res: ServerResponse, allow: string) {
  res.setHeader("Allow", allow);
  sendJson(res, 405, { error: "Method not allowed" });
}

async function handleAssistant(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, "POST");

  const body = (await readJsonBody(req)) as Record<string, unknown>;
  const prompt = String(body.prompt ?? "").trim();
  const history = Array.isArray(body.history) ? (body.history as AssistantMessage[]) : [];

  if (!prompt) return sendJson(res, 400, { error: "Prompt is required." });

  try {
    await assertSignedRequest(req.headers, "assistant:ask", { prompt, history });
    const completion = await getAssistantReply(prompt, history);
    return sendJson(res, 200, completion);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Assistant request failed.";
    const code = message.toLowerCase().includes("authorization") || message.toLowerCase().includes("signature") || message.toLowerCase().includes("expired") ? 401 : 502;
    return sendJson(res, code, { error: message });
  }
}

async function handleCampaigns(req: IncomingMessage, res: ServerResponse) {
  if (req.method === "GET") {
    // Product behavior: campaigns created on-chain should show up in the UI even if the
    // hoster didn't (or couldn't) sync custom title/description metadata yet.
    const campaigns = await getCampaigns();
    const existing = new Set(
      (Array.isArray(campaigns) ? campaigns : []).map((c) => String((c as { chainCampaignId?: unknown }).chainCampaignId ?? "")),
    );

    try {
      const nextId = await getNextCampaignId();
      const latest = Number(nextId - 1n);
      const LOOKBACK = 25;
      const start = Math.max(1, latest - LOOKBACK + 1);
      for (let id = start; id <= latest; id += 1) {
        const sid = String(id);
        if (existing.has(sid)) continue;
        const [creativeURI, category] = await getCampaignPublicInfo(sid);
        const [model, rateWei] = await getCampaignSettlementTerms(sid);
        const advertiser = (await getCampaignHoster(sid)) as string;
        const pricingModel = model === 2 ? "CPM" : "CPC";
        const rawRate = formatEther(rateWei);
        const [whole, frac = ""] = rawRate.split(".");
        const rate = frac ? `${whole}.${frac.slice(0, 6)}`.replace(/\.$/, "") : whole;

        const auto = await createCampaignIfAbsent({
          chainCampaignId: sid,
          title: `Campaign #${sid}`,
          description: "On-chain campaign. Add details in Studio to customize this listing.",
          creativeURI,
          category,
          pricingModel,
          rate: rate || "0",
          advertiser,
        });
        (campaigns as Array<Record<string, unknown>>).push(auto as Record<string, unknown>);
        existing.add(sid);
      }
      (campaigns as Array<Record<string, unknown>>).sort(
        (a, b) => Number(String((b as any).chainCampaignId ?? 0)) - Number(String((a as any).chainCampaignId ?? 0)),
      );
    } catch {
      // ignore chain sync failures; still return DB results
    }

    return sendJson(res, 200, campaigns);
  }

  if (req.method !== "POST") return methodNotAllowed(res, "GET, POST");

  let payload: Record<string, unknown>;
  try {
    payload = await readJsonBody(req);
  } catch (error) {
    return sendJson(res, 400, { error: error instanceof Error ? error.message : "Invalid request body." });
  }

  let signerAddress = "";
  try {
    signerAddress = await assertSignedRequest(req.headers, "campaigns:create", payload);
  } catch (error) {
    return sendJson(res, 401, { error: error instanceof Error ? error.message : "Unauthorized request." });
  }

  const sanitized = sanitizeCampaignMetadata({ ...payload, advertiser: signerAddress });

  try {
    const onchainHoster = await getCampaignHoster(sanitized.chainCampaignId);
    if (onchainHoster.toLowerCase() !== signerAddress) {
      throw new Error("Signed wallet does not own this on-chain campaign.");
    }
  } catch (error) {
    return sendJson(res, 409, { error: error instanceof Error ? error.message : "Campaign ownership check failed." });
  }

  const campaign = await createCampaign(sanitized);
  return sendJson(res, 201, campaign);
}

async function handleCampaignById(req: IncomingMessage, res: ServerResponse, chainCampaignId: string) {
  if (req.method !== "GET") return methodNotAllowed(res, "GET");
  try {
    const doc = await getCampaignByChainId(chainCampaignId);
    if (!doc) return sendJson(res, 404, { error: "Not found" });
    return sendJson(res, 200, doc);
  } catch (error) {
    return sendJson(res, 500, { error: error instanceof Error ? error.message : "Failed to load campaign." });
  }
}

async function handleSlots(req: IncomingMessage, res: ServerResponse) {
  if (req.method === "GET") {
    const slots = await getSlots();
    return sendJson(res, 200, slots);
  }

  if (req.method !== "POST") return methodNotAllowed(res, "GET, POST");

  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    return sendJson(res, 400, { error: error instanceof Error ? error.message : "Invalid request body." });
  }

  let signerAddress = "";
  try {
    signerAddress = await assertSignedRequest(req.headers, "slots:create", body);
  } catch (error) {
    return sendJson(res, 401, { error: error instanceof Error ? error.message : "Unauthorized request." });
  }

  const sanitized = sanitizeSlotMetadata({ ...body, developer: signerAddress });

  try {
    const onchainDeveloper = await getSlotDeveloper(sanitized.chainSlotId);
    if (onchainDeveloper.toLowerCase() !== signerAddress) {
      throw new Error("Signed wallet does not own this on-chain slot.");
    }
  } catch (error) {
    return sendJson(res, 409, { error: error instanceof Error ? error.message : "Slot ownership check failed." });
  }

  const slot = await createSlot(sanitized);
  return sendJson(res, 201, slot);
}

async function handleSlotPatch(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "PATCH") return methodNotAllowed(res, "PATCH");

  const url = getUrl(req);
  const chainSlotId = url.searchParams.get("chainSlotId") ?? "";

  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    return sendJson(res, 400, { error: error instanceof Error ? error.message : "Invalid request body." });
  }

  const payload = { assignedCampaignId: String(body.assignedCampaignId ?? "") };

  let signerAddress = "";
  try {
    signerAddress = await assertSignedRequest(req.headers, "slots:assign", payload);
  } catch (error) {
    return sendJson(res, 401, { error: error instanceof Error ? error.message : "Unauthorized request." });
  }

  try {
    const onchainDeveloper = await getSlotDeveloper(chainSlotId);
    const onchainAssignment = await getAssignedCampaignId(chainSlotId);

    if (onchainDeveloper.toLowerCase() !== signerAddress) {
      throw new Error("Signed wallet does not own this on-chain slot.");
    }

    if (onchainAssignment !== payload.assignedCampaignId) {
      throw new Error("On-chain slot assignment does not match the requested campaign.");
    }
  } catch (error) {
    return sendJson(res, 409, { error: error instanceof Error ? error.message : "Slot assignment verification failed." });
  }

  const updated = await assignSlotCampaign(chainSlotId, payload.assignedCampaignId);
  if (!updated) return sendJson(res, 404, { error: "Slot not found." });
  return sendJson(res, 200, updated);
}

async function handlePublicCampaign(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") return methodNotAllowed(res, "GET");
  const url = getUrl(req);
  const campaignId = Number(url.searchParams.get("campaignId") ?? url.searchParams.get("id"));
  if (!Number.isFinite(campaignId) || campaignId < 1) return sendJson(res, 400, { error: "campaignId is required." });

  try {
    const campaign = await getPublicCampaignById(campaignId);
    return sendJson(res, 200, campaign);
  } catch (error) {
    return sendJson(res, 404, { error: error instanceof Error ? error.message : "Campaign not found." });
  }
}

async function handleEmbed(req: IncomingMessage, res: ServerResponse) {
  const url = getUrl(req);
  const mode = url.searchParams.get("mode") || "script";
  const slotId = Number(url.searchParams.get("slotId"));
  const hasSlotId = Number.isFinite(slotId) && slotId > 0;

  if (!hasSlotId) {
    res.statusCode = 400;
    res.setHeader("Content-Type", mode === "frame" ? "text/html; charset=utf-8" : "application/javascript; charset=utf-8");
    res.end(mode === "frame" ? "<p>AdNode slotId is required.</p>" : "console.error('AdNode slotId is required.');");
    return;
  }

  if (mode === "frame") {
    try {
      const campaign = await getPublicCampaignBySlotId(slotId);
      const origin = `${url.protocol}//${url.host}`;
      const payload = createEmbedFramePayload(campaign, origin);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.statusCode = 200;
      res.end(buildEmbedFrameHtml(payload.campaign, { origin: payload.origin, measurementToken: payload.measurementToken }));
    } catch (error) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.statusCode = 404;
      res.end(`<p>${error instanceof Error ? error.message : "Campaign not found."}</p>`);
    }
    return;
  }

  const origin = `${url.protocol}//${url.host}`;
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.statusCode = 200;
  res.end(buildEmbedScript(origin, { slotId }));
}

async function handleMeasure(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, "POST");

  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    return sendJson(res, 400, { error: error instanceof Error ? error.message : "Invalid request body." });
  }

  const token = String(body.token ?? "");
  const eventType = String(body.eventType ?? "");
  const pageUrl = String(body.pageUrl ?? "");
  const referrer = String(body.referrer ?? "");

  if (!token || (eventType !== "impression" && eventType !== "click")) {
    return sendJson(res, 400, { error: "token and valid eventType are required." });
  }

  let verifiedToken: ReturnType<typeof verifyMeasurementToken>;
  try {
    verifiedToken = verifyMeasurementToken(token);
  } catch (error) {
    return sendJson(res, 401, { error: error instanceof Error ? error.message : "Invalid measurement token." });
  }

  let campaign: Awaited<ReturnType<typeof getPublicCampaignBySlotId>>;
  try {
    campaign = await getPublicCampaignBySlotId(Number(verifiedToken.chainSlotId));
  } catch (error) {
    return sendJson(res, 404, { error: error instanceof Error ? error.message : "Assigned campaign not found." });
  }

  if (campaign.id !== verifiedToken.chainCampaignId) {
    return sendJson(res, 409, { error: "Embed token campaign assignment no longer matches slot state." });
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

  if (duplicate) return sendJson(res, 202, { ok: true, duplicate: true });

  try {
    const result = await syncMeasurementToChain(record);
    return sendJson(res, 202, { ok: true, duplicate: false, settlement: result });
  } catch (error) {
    await markMeasurementPending(record, error);
    return sendJson(res, 202, {
      ok: true,
      duplicate: false,
      settlement: { status: "pending_chain" },
      warning: error instanceof Error ? error.message : "Chain sync failed.",
    });
  }
}

async function handleHealth(_req: IncomingMessage, res: ServerResponse) {
  const databaseReady = await getDatabaseReady();
  const chain = await getRegistryChainHealth();
  return sendJson(res, 200, { ok: true, service: "adnode-api", databaseReady, ...chain });
}

async function handleUploadCreative(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, "POST");

  try {
    const file = await parseMultipartUpload(req);
    await assertSignedRequest(req.headers, "uploads:creative", {
      filename: file.filename,
      size: file.buffer.byteLength,
      type: file.mimeType,
    });
    const uri = await uploadBufferToPinata(file);
    return sendJson(res, 201, { uri });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Creative upload failed.";
    const code = message.toLowerCase().includes("authorization") || message.toLowerCase().includes("signature") || message.toLowerCase().includes("expired") ? 401 : 400;
    return sendJson(res, code, { error: message });
  }
}

async function handleSettlementReplay(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "POST") return methodNotAllowed(res, "POST");

  let payload: Record<string, unknown>;
  try {
    payload = await readJsonBody(req);
  } catch (error) {
    return sendJson(res, 400, { error: error instanceof Error ? error.message : "Invalid request body." });
  }

  try {
    await assertSignedRequest(req.headers, "settlement:replay", payload);
  } catch (error) {
    return sendJson(res, 401, { error: error instanceof Error ? error.message : "Unauthorized request." });
  }

  try {
    const summary = await replayPendingMeasurements();
    return sendJson(res, 200, { ok: true, ...summary });
  } catch (error) {
    return sendJson(res, 500, { error: error instanceof Error ? error.message : "Settlement replay failed." });
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const pathname = getPathname(req);

  // Normalize: support both /embed and /embed.js legacy.
  const p = pathname === "/embed.js" ? "/embed" : pathname;

  try {
    if (p === "/health") return await handleHealth(req, res);
    if (p === "/campaigns") return await handleCampaigns(req, res);
    if (p.startsWith("/campaigns/")) return await handleCampaignById(req, res, decodeURIComponent(p.slice("/campaigns/".length)));
    if (p === "/slots") return await handleSlots(req, res);
    if (p === "/slot") return await handleSlotPatch(req, res);
    if (p === "/public-campaign") return await handlePublicCampaign(req, res);
    if (p === "/embed") return await handleEmbed(req, res);
    if (p === "/measure") return await handleMeasure(req, res);
    if (p === "/uploads/creative") return await handleUploadCreative(req, res);
    if (p === "/settlement/replay") return await handleSettlementReplay(req, res);
    if (p === "/assistant") return await handleAssistant(req, res);

    return sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    return sendJson(res, 500, { error: error instanceof Error ? error.message : "Server error" });
  }
}
