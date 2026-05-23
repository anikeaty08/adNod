import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import { createCampaign, getCampaignByChainId, getCampaigns, getDatabaseReady, sanitizeCampaignMetadata } from "./campaign-store.js";
import { parseMultipartUpload, uploadBufferToPinata } from "./pinata.js";
import { getAssistantReply, type AssistantMessage } from "./assistant.js";
import { buildEmbedFrameHtml, buildEmbedScript, createEmbedFramePayload, getPublicCampaignById, getPublicCampaignBySlotId } from "./public-campaigns.js";
import { assignSlotCampaign, createSlot, getSlotByKey, getSlots, sanitizeSlotMetadata } from "./slot-store.js";
import { assertSignedRequest } from "./request-auth.js";
import { getAssignedCampaignId, getCampaignHoster, getRegistryChainHealth, getSlotDeveloper } from "./chain-state.js";
import { assertBoundMeasurementToken, buildMeasurementEventKey, buildMeasurementFingerprint, consumeMeasurementNonce, hashPageUrl, verifyMeasurementToken } from "./measurement.js";
import { recordMeasurement } from "./measurement-store.js";
import { replayPendingMeasurements } from "./settlement-service.js";
import { assertRuntimeSafety, strictModeEnabled } from "./runtime.js";
import { startSettlementReplayWorker } from "./settlement-worker.js";
import { backfillSlotsFromChain } from "./slot-chain-sync.js";
import { evaluateMeasurementPolicy } from "./measurement-policy.js";
import { measurementQuotaExceeded } from "./measurement-quota.js";
import { assertRole } from "./roles.js";
import { assertCreativeUploadQuota } from "./upload-quota.js";
import { listAccessRequests } from "./admin-service.js";
import { getMetricsSnapshot, incrementMetric, logError, logInfo, requestId } from "./observability.js";
import { ensureDatabaseIndexes } from "./database-indexes.js";

const app = express();
const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const extraCorsOrigins = (process.env.ADNODE_CORS_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function corsAllowsOrigin(origin: string) {
  return localhostOriginPattern.test(origin) || extraCorsOrigins.includes(origin);
}
const rateWindowMs = 60_000;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(maxRequests: number, label: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${label}:${req.ip ?? req.socket.remoteAddress ?? "unknown"}`;
    const now = Date.now();
    const current = rateBuckets.get(key);
    if (!current || now > current.resetAt) {
      rateBuckets.set(key, { count: 1, resetAt: now + rateWindowMs });
      next();
      return;
    }
    if (current.count >= maxRequests) {
      res.status(429).json({ error: "Rate limit exceeded." });
      return;
    }
    current.count += 1;
    next();
  };
}

app.use((req, res, next) => {
  const id = requestId();
  res.header("X-Request-Id", id);
  const started = Date.now();
  res.on("finish", () => {
    logInfo("http_request", {
      requestId: id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - started,
    });
  });

  const origin = req.headers.origin;

  if (origin && corsAllowsOrigin(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type,X-AdNode-Action,X-AdNode-Address,X-AdNode-Timestamp,X-AdNode-Signature,X-AdNode-Upload-Filename,X-AdNode-Upload-Size,X-AdNode-Upload-Type");
  }

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

app.use(express.json());

app.get("/health", async (_req, res) => {
  const databaseReady = await getDatabaseReady();
  const chain = await getRegistryChainHealth();
  res.json({ ok: true, service: "adnode-api", databaseReady, ...chain });
});

app.get("/api/campaigns", async (_req, res) => {
  const campaigns = await getCampaigns();
  res.json(campaigns);
});

app.get("/api/campaigns/:chainCampaignId", async (req, res) => {
  try {
    const doc = await getCampaignByChainId(String(req.params.chainCampaignId ?? ""));
    if (!doc) {
      res.status(404).json({ error: "Campaign not found." });
      return;
    }
    res.json(doc);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Lookup failed." });
  }
});

app.get("/api/slots", async (_req, res) => {
  const slots = await getSlots();
  try {
    await backfillSlotsFromChain(slots as Array<Record<string, unknown>>);
  } catch {
    // Keep the endpoint usable when RPC is unavailable; DB rows still return.
  }
  res.json(slots);
});

app.post("/api/ops/metrics", async (req, res) => {
  try {
    const signer = await assertSignedRequest(req.headers, "ops:metrics", (req.body as Record<string, unknown>) ?? {});
    assertRole(signer, "admin");
    res.json({ ok: true, metrics: getMetricsSnapshot() });
  } catch (error) {
    res.status(401).json({ error: error instanceof Error ? error.message : "Unauthorized metrics request." });
  }
});

app.get("/api/public-campaign", async (req, res) => {
  const campaignId = Number(req.query.campaignId ?? req.query.id);

  if (!Number.isFinite(campaignId) || campaignId < 1) {
    res.status(400).json({ error: "campaignId is required." });
    return;
  }

  try {
    const campaign = await getPublicCampaignById(campaignId);
    res.json(campaign);
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : "Campaign not found." });
  }
});

async function resolveEmbedSlot(req: Request) {
  const rawSlotId = String(req.query.slotId ?? "");
  const rawSlotKey = String(req.query.slotKey ?? "");
  if (/^\d+$/.test(rawSlotId)) {
    return { slotId: Number(rawSlotId), slotKey: rawSlotKey };
  }
  if (rawSlotKey) {
    const slot = await getSlotByKey(rawSlotKey);
    const chainSlotId = String((slot as { chainSlotId?: string } | null)?.chainSlotId ?? "");
    if (/^\d+$/.test(chainSlotId)) return { slotId: Number(chainSlotId), slotKey: rawSlotKey };
  }
  return { slotId: 0, slotKey: rawSlotKey };
}

function embedContextFromRequest(req: Request, slotKey: string) {
  return {
    slotKey,
    publisherOrigin: String(req.query.publisherOrigin ?? ""),
    pageUrl: String(req.query.pageUrl ?? ""),
    sessionId: String(req.query.sessionId ?? ""),
  };
}

app.get("/api/embed", async (req, res) => {
  const mode = String(req.query.mode ?? "script");
  const { slotId, slotKey } = await resolveEmbedSlot(req);
  const hasSlotId = Number.isFinite(slotId) && slotId > 0;

  if (!hasSlotId) {
    res
      .status(400)
      .type(mode === "frame" ? "text/html" : "application/javascript")
      .send(mode === "frame" ? "<p>AdNode slot is required.</p>" : "console.error('AdNode slot is required.');");
    return;
  }

  if (mode === "frame") {
    try {
      const campaign = await getPublicCampaignBySlotId(slotId);
      incrementMetric("embed_render");
      const origin = `${req.protocol}://${req.get("host")}`;
      const context = embedContextFromRequest(req, slotKey);
      const payload = createEmbedFramePayload(campaign, origin, context);
      res.type("text/html").send(buildEmbedFrameHtml(payload.campaign, { origin: payload.origin, measurementToken: payload.measurementToken, pageUrl: context.pageUrl, publisherOrigin: context.publisherOrigin }));
    } catch (error) {
      res.status(404).type("text/html").send(`<p>${error instanceof Error ? error.message : "Campaign not found."}</p>`);
    }
    return;
  }

  const origin = `${req.protocol}://${req.get("host")}`;
  res.type("application/javascript").send(buildEmbedScript(origin, slotKey ? { slotKey, slotId } : { slotId }));
});

app.get("/api/embed.js", async (req, res) => {
  const { slotId, slotKey } = await resolveEmbedSlot(req);
  const hasSlotId = Number.isFinite(slotId) && slotId > 0;

  if (!hasSlotId) {
    res.status(400).type("application/javascript").send("console.error('AdNode slot is required.');");
    return;
  }

  const origin = `${req.protocol}://${req.get("host")}`;
  res.type("application/javascript").send(buildEmbedScript(origin, slotKey ? { slotKey, slotId } : { slotId }));
});

app.get("/api/embed-frame", async (req, res) => {
  const { slotId, slotKey } = await resolveEmbedSlot(req);
  const hasSlotId = Number.isFinite(slotId) && slotId > 0;

  if (!hasSlotId) {
    res.status(400).type("text/html").send("<p>AdNode slot is required.</p>");
    return;
  }

  try {
    const campaign = await getPublicCampaignBySlotId(slotId);
    const origin = `${req.protocol}://${req.get("host")}`;
    const context = embedContextFromRequest(req, slotKey);
    const payload = createEmbedFramePayload(campaign, origin, context);
    res.type("text/html").send(buildEmbedFrameHtml(payload.campaign, { origin: payload.origin, measurementToken: payload.measurementToken, pageUrl: context.pageUrl, publisherOrigin: context.publisherOrigin }));
  } catch (error) {
    res.status(404).type("text/html").send(`<p>${error instanceof Error ? error.message : "Campaign not found."}</p>`);
  }
});

app.post("/api/measure", rateLimit(120, "measure"), async (req, res) => {
  const body = (req.body as Record<string, unknown>) ?? {};
  const token = String(body.token ?? "");
  const eventType = String(body.eventType ?? "");
  const pageUrl = String(body.pageUrl ?? "");
  const referrer = String(body.referrer ?? "");
  const publisherOrigin = String(body.publisherOrigin ?? "");

  if (!token || (eventType !== "impression" && eventType !== "click")) {
    res.status(400).json({ error: "token and valid eventType are required." });
    return;
  }

  let verifiedToken;
  try {
    verifiedToken = verifyMeasurementToken(token);
    if (strictModeEnabled()) assertBoundMeasurementToken(verifiedToken);
  } catch (error) {
    res.status(401).json({ error: error instanceof Error ? error.message : "Invalid measurement token." });
    return;
  }

  let campaign;
  try {
    campaign = await getPublicCampaignBySlotId(Number(verifiedToken.chainSlotId));
  } catch (error) {
    res.status(404).json({ error: error instanceof Error ? error.message : "Assigned campaign not found." });
    return;
  }

  if (campaign.id !== verifiedToken.chainCampaignId) {
    res.status(409).json({ error: "Embed token campaign assignment no longer matches slot state." });
    return;
  }
  if (verifiedToken.publisherOrigin && publisherOrigin && verifiedToken.publisherOrigin !== publisherOrigin) {
    res.status(401).json({ error: "Measurement token origin mismatch." });
    return;
  }
  if (verifiedToken.pageUrlHash && hashPageUrl(pageUrl) !== verifiedToken.pageUrlHash) {
    res.status(401).json({ error: "Measurement token page mismatch." });
    return;
  }

  try {
    await consumeMeasurementNonce(verifiedToken, eventType as "impression" | "click");
  } catch (error) {
    incrementMetric("measurement_duplicate");
    res.status(202).json({ ok: true, duplicate: true, error: error instanceof Error ? error.message : "Duplicate measurement." });
    return;
  }

  const userAgent = String(req.headers["user-agent"] ?? "");
  const remoteAddress = String(req.socket.remoteAddress ?? "");
  const policy = evaluateMeasurementPolicy({
    eventType: eventType as "impression" | "click",
    pageUrl,
    referrer,
    publisherOrigin,
    userAgent,
    remoteAddress,
  });
  if (
    await measurementQuotaExceeded({
      chainCampaignId: campaign.id,
      chainSlotId: campaign.slotId,
      eventType: eventType as "impression" | "click",
    })
  ) {
    policy.billable = false;
    policy.fraudStatus = "review";
    policy.fraudScore = Math.max(policy.fraudScore, 70);
    policy.fraudReasons = [...policy.fraudReasons, "quota_exceeded"];
  }
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
    nonce: verifiedToken.nonce,
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
    settlementId: eventKey,
    sessionId: verifiedToken.sessionId,
    nonce: verifiedToken.nonce,
    publisherOrigin,
    pageUrlHash: verifiedToken.pageUrlHash,
    billable: policy.billable,
    fraudStatus: policy.fraudStatus,
    fraudScore: policy.fraudScore,
    fraudReasons: policy.fraudReasons,
    reviewHash: policy.reviewHash,
  });

  if (duplicate) {
    incrementMetric("measurement_duplicate");
    res.status(202).json({ ok: true, duplicate: true });
    return;
  }

  if (record.status === "review") incrementMetric("measurement_review");
  else if (record.status === "rejected") incrementMetric("measurement_reject");
  else incrementMetric("measurement_accept");
  res.status(202).json({ ok: true, duplicate: false, status: record.status });
});

app.post("/api/settlement/replay", rateLimit(15, "replay"), async (req, res) => {
  try {
    const payload = ((req.body as Record<string, unknown> | undefined) ?? {});
    const signer = await assertSignedRequest(req.headers, "settlement:replay", payload);
    assertRole(signer, "settlement");
  } catch (error) {
    res.status(401).json({ error: error instanceof Error ? error.message : "Unauthorized request." });
    return;
  }

  try {
    const summary = await replayPendingMeasurements();
    res.json({ ok: true, ...summary });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Settlement replay failed." });
  }
});

app.post("/api/admin/access-requests", rateLimit(30, "admin-access"), async (req, res) => {
  const payload = ((req.body as Record<string, unknown> | undefined) ?? {});
  try {
    const signer = await assertSignedRequest(req.headers, "admin:access:list", payload);
    assertRole(signer, "admin");
    const rows = await listAccessRequests();
    res.json({ rows });
  } catch (error) {
    incrementMetric("settlement_failure");
    res.status(401).json({ error: error instanceof Error ? error.message : "Unauthorized admin request." });
  }
});

app.post("/api/campaigns", async (req, res) => {
  let signerAddress = "";

  try {
    signerAddress = await assertSignedRequest(req.headers, "campaigns:create", (req.body as Record<string, unknown>) ?? {});
  } catch (error) {
    res.status(401).json({ error: error instanceof Error ? error.message : "Unauthorized request." });
    return;
  }

  const payload = sanitizeCampaignMetadata({ ...(req.body as Record<string, unknown>), advertiser: signerAddress });

  try {
    const onchainHoster = await getCampaignHoster(payload.chainCampaignId);
    if (onchainHoster.toLowerCase() !== signerAddress) {
      throw new Error("Signed wallet does not own this on-chain campaign.");
    }
  } catch (error) {
    res.status(409).json({ error: error instanceof Error ? error.message : "Campaign ownership check failed." });
    return;
  }

  const campaign = await createCampaign(payload);
  res.status(201).json(campaign);
});

app.post("/api/slots", async (req, res) => {
  let signerAddress = "";

  try {
    signerAddress = await assertSignedRequest(req.headers, "slots:create", (req.body as Record<string, unknown>) ?? {});
  } catch (error) {
    res.status(401).json({ error: error instanceof Error ? error.message : "Unauthorized request." });
    return;
  }

  const payload = sanitizeSlotMetadata({ ...(req.body as Record<string, unknown>), developer: signerAddress });

  try {
    const onchainDeveloper = await getSlotDeveloper(payload.chainSlotId);
    if (onchainDeveloper.toLowerCase() !== signerAddress) {
      throw new Error("Signed wallet does not own this on-chain slot.");
    }
  } catch (error) {
    res.status(409).json({ error: error instanceof Error ? error.message : "Slot ownership check failed." });
    return;
  }

  const slot = await createSlot(payload);
  res.status(201).json(slot);
});

async function handleSlotAssignment(req: Request, res: Response) {
  const payload = { assignedCampaignId: String((req.body as Record<string, unknown>)?.assignedCampaignId ?? "") };
  const chainSlotId = String(req.params.chainSlotId ?? req.query.chainSlotId ?? "");
  let signerAddress = "";

  try {
    signerAddress = await assertSignedRequest(req.headers, "slots:assign", payload);
  } catch (error) {
    res.status(401).json({ error: error instanceof Error ? error.message : "Unauthorized request." });
    return;
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
    res.status(409).json({ error: error instanceof Error ? error.message : "Slot assignment verification failed." });
    return;
  }

  const updated = await assignSlotCampaign(chainSlotId, payload.assignedCampaignId);

  if (!updated) {
    res.status(404).json({ error: "Slot not found." });
    return;
  }

  res.json(updated);
}

app.patch("/api/slot", handleSlotAssignment);
app.patch("/api/slots/:chainSlotId", handleSlotAssignment);

app.post("/api/assistant", async (req, res) => {
  const body = (req.body as Record<string, unknown>) ?? {};
  const prompt = String(body.prompt ?? "").trim();
  const history = Array.isArray(body.history) ? (body.history as AssistantMessage[]) : [];

  if (!prompt) {
    res.status(400).json({ error: "Prompt is required." });
    return;
  }

  try {
    await assertSignedRequest(req.headers, "assistant:ask", { prompt, history });
    incrementMetric("assistant_usage");
    const completion = await getAssistantReply(prompt, history);
    res.json(completion);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Assistant request failed.";
    res.status(message.toLowerCase().includes("authorization") || message.toLowerCase().includes("unauthorized") || message.toLowerCase().includes("signature") ? 401 : 502).json({ error: message });
  }
});

/** Unsigned chat for the in-app help widget (rate-limited). Groq key stays server-side. */
app.post("/api/assistant/chat", rateLimit(30, "assistant-chat"), async (req, res) => {
  const body = (req.body as Record<string, unknown>) ?? {};
  const prompt = String(body.prompt ?? "").trim();
  const history = Array.isArray(body.history) ? (body.history as AssistantMessage[]) : [];

  if (!prompt || prompt.length > 4000) {
    res.status(400).json({ error: "Prompt is required (max 4000 chars)." });
    return;
  }

  try {
    const completion = await getAssistantReply(prompt, history);
    res.json(completion);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Assistant request failed.";
    res.status(502).json({ error: message });
  }
});

async function handleCreativeUpload(req: Request, res: Response) {
  try {
    incrementMetric("assistant_usage");
    const signedMeta = {
      filename: String(req.headers["x-adnode-upload-filename"] ?? ""),
      size: Number(req.headers["x-adnode-upload-size"] ?? 0),
      type: String(req.headers["x-adnode-upload-type"] ?? "application/octet-stream"),
    };
    const signer = await assertSignedRequest(req.headers, "uploads:creative", signedMeta);
    await assertCreativeUploadQuota(signer, signedMeta.size, signedMeta.type);
    const file = await parseMultipartUpload(req);
    if (file.filename !== signedMeta.filename || file.buffer.byteLength !== signedMeta.size || file.mimeType !== signedMeta.type) {
      throw new Error("Upload metadata does not match authorization payload.");
    }
    const uri = await uploadBufferToPinata(file);
    incrementMetric("upload_success");
    res.status(201).json({ uri });
  } catch (error) {
    incrementMetric("upload_failure");
    logError("creative_upload_failed", { error: error instanceof Error ? error.message : "Creative upload failed." });
    const message = error instanceof Error ? error.message : "Creative upload failed.";
    res.status(message.toLowerCase().includes("authorization") || message.toLowerCase().includes("unauthorized") || message.toLowerCase().includes("signature") ? 401 : 400).json({ error: message });
  }
}

app.post("/api/uploads/creative", handleCreativeUpload);
app.post("/api/upload-creative", handleCreativeUpload);

const port = Number(process.env.PORT || 4000);

getDatabaseReady().then((databaseReady) => {
  if (databaseReady) {
    console.log("MongoDB connected for AdNode API.");
    void ensureDatabaseIndexes().catch((error) => {
      logError("database_index_bootstrap_failed", { error: error instanceof Error ? error.message : "Index bootstrap failed." });
    });
  } else {
    console.warn("MongoDB unavailable, starting AdNode API in local fallback mode.");
  }
});

assertRuntimeSafety();

app.listen(port, () => {
  console.log(`AdNode API listening on http://localhost:${port}`);
});

startSettlementReplayWorker();
