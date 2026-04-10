import "dotenv/config";
import express, { type Request, type Response } from "express";
import { createCampaign, getCampaigns, getDatabaseReady, sanitizeCampaignMetadata } from "./campaign-store.js";
import { parseMultipartUpload, uploadBufferToPinata } from "./pinata.js";
import { getAssistantReply, type AssistantMessage } from "./assistant.js";
import { buildEmbedFrameHtml, buildEmbedScript, createEmbedFramePayload, getPublicCampaignById, getPublicCampaignBySlotId } from "./public-campaigns.js";
import { assignSlotCampaign, createSlot, getSlots, sanitizeSlotMetadata } from "./slot-store.js";
import { assertSignedRequest } from "./request-auth.js";
import { getAssignedCampaignId, getCampaignHoster, getSlotDeveloper } from "./chain-state.js";
import { buildMeasurementEventKey, buildMeasurementFingerprint, verifyMeasurementToken } from "./measurement.js";
import { recordMeasurement } from "./measurement-store.js";
import { markMeasurementPending, replayPendingMeasurements, syncMeasurementToChain } from "./settlement-service.js";

const app = express();
const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && localhostOriginPattern.test(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type,X-AdNode-Action,X-AdNode-Address,X-AdNode-Timestamp,X-AdNode-Signature");
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
  res.json({ ok: true, service: "adnode-api", databaseReady });
});

app.get("/api/campaigns", async (_req, res) => {
  const campaigns = await getCampaigns();
  res.json(campaigns);
});

app.get("/api/slots", async (_req, res) => {
  const slots = await getSlots();
  res.json(slots);
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

app.get("/api/embed", async (req, res) => {
  const mode = String(req.query.mode ?? "script");
  const slotId = Number(req.query.slotId);
  const hasSlotId = Number.isFinite(slotId) && slotId > 0;

  if (!hasSlotId) {
    res
      .status(400)
      .type(mode === "frame" ? "text/html" : "application/javascript")
      .send(mode === "frame" ? "<p>AdNode slotId is required.</p>" : "console.error('AdNode slotId is required.');");
    return;
  }

  if (mode === "frame") {
    try {
      const campaign = await getPublicCampaignBySlotId(slotId);
      const origin = `${req.protocol}://${req.get("host")}`;
      const payload = createEmbedFramePayload(campaign, origin);
      res.type("text/html").send(buildEmbedFrameHtml(payload.campaign, { origin: payload.origin, measurementToken: payload.measurementToken }));
    } catch (error) {
      res.status(404).type("text/html").send(`<p>${error instanceof Error ? error.message : "Campaign not found."}</p>`);
    }
    return;
  }

  const origin = `${req.protocol}://${req.get("host")}`;
  res.type("application/javascript").send(buildEmbedScript(origin, { slotId }));
});

app.get("/api/embed.js", async (req, res) => {
  const slotId = Number(req.query.slotId);
  const hasSlotId = Number.isFinite(slotId) && slotId > 0;

  if (!hasSlotId) {
    res.status(400).type("application/javascript").send("console.error('AdNode slotId is required.');");
    return;
  }

  const origin = `${req.protocol}://${req.get("host")}`;
  res.type("application/javascript").send(buildEmbedScript(origin, { slotId }));
});

app.get("/api/embed-frame", async (req, res) => {
  const slotId = Number(req.query.slotId);
  const hasSlotId = Number.isFinite(slotId) && slotId > 0;

  if (!hasSlotId) {
    res.status(400).type("text/html").send("<p>AdNode slotId is required.</p>");
    return;
  }

  try {
    const campaign = await getPublicCampaignBySlotId(slotId);
    const origin = `${req.protocol}://${req.get("host")}`;
    const payload = createEmbedFramePayload(campaign, origin);
    res.type("text/html").send(buildEmbedFrameHtml(payload.campaign, { origin: payload.origin, measurementToken: payload.measurementToken }));
  } catch (error) {
    res.status(404).type("text/html").send(`<p>${error instanceof Error ? error.message : "Campaign not found."}</p>`);
  }
});

app.post("/api/measure", async (req, res) => {
  const body = (req.body as Record<string, unknown>) ?? {};
  const token = String(body.token ?? "");
  const eventType = String(body.eventType ?? "");
  const pageUrl = String(body.pageUrl ?? "");
  const referrer = String(body.referrer ?? "");

  if (!token || (eventType !== "impression" && eventType !== "click")) {
    res.status(400).json({ error: "token and valid eventType are required." });
    return;
  }

  let verifiedToken;
  try {
    verifiedToken = verifyMeasurementToken(token);
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

  const forwardedFor = req.headers["x-forwarded-for"];
  const ip = Array.isArray(forwardedFor) ? forwardedFor[0] ?? "" : String(forwardedFor ?? req.socket.remoteAddress ?? "");
  const userAgent = String(req.headers["user-agent"] ?? "");
  const fingerprint = buildMeasurementFingerprint({
    ip,
    userAgent,
    eventType,
    pageUrl,
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
    res.status(202).json({ ok: true, duplicate: true });
    return;
  }

  try {
    const result = await syncMeasurementToChain(record);
    res.status(202).json({ ok: true, duplicate: false, settlement: result });
  } catch (error) {
    await markMeasurementPending(record, error);
    res.status(202).json({
      ok: true,
      duplicate: false,
      settlement: { status: "pending_chain" },
      warning: error instanceof Error ? error.message : "Chain sync failed.",
    });
  }
});

app.post("/api/settlement/replay", async (_req, res) => {
  try {
    const summary = await replayPendingMeasurements();
    res.json({ ok: true, ...summary });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Settlement replay failed." });
  }
});

app.post("/api/campaigns", async (req, res) => {
  const candidate = sanitizeCampaignMetadata(req.body as Record<string, unknown>);
  let signerAddress = "";

  try {
    signerAddress = await assertSignedRequest(req.headers, "campaigns:create", candidate);
  } catch (error) {
    res.status(401).json({ error: error instanceof Error ? error.message : "Unauthorized request." });
    return;
  }

  const payload = sanitizeCampaignMetadata({
    ...candidate,
    advertiser: signerAddress,
  });

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
  const candidate = sanitizeSlotMetadata(req.body as Record<string, unknown>);
  let signerAddress = "";

  try {
    signerAddress = await assertSignedRequest(req.headers, "slots:create", candidate);
  } catch (error) {
    res.status(401).json({ error: error instanceof Error ? error.message : "Unauthorized request." });
    return;
  }

  const payload = sanitizeSlotMetadata({
    ...candidate,
    developer: signerAddress,
  });

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
    const completion = await getAssistantReply(prompt, history);
    res.json(completion);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Assistant request failed.";
    res.status(message.toLowerCase().includes("authorization") || message.toLowerCase().includes("unauthorized") || message.toLowerCase().includes("signature") ? 401 : 502).json({ error: message });
  }
});

app.post("/api/uploads/creative", async (req, res) => {
  try {
    const file = await parseMultipartUpload(req);
    await assertSignedRequest(req.headers, "uploads:creative", {
      filename: file.filename,
      size: file.buffer.byteLength,
      type: file.mimeType,
    });
    const uri = await uploadBufferToPinata(file);
    res.status(201).json({ uri });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Creative upload failed.";
    res.status(message.toLowerCase().includes("authorization") || message.toLowerCase().includes("unauthorized") || message.toLowerCase().includes("signature") ? 401 : 400).json({ error: message });
  }
});

const port = Number(process.env.PORT || 4000);

getDatabaseReady().then((databaseReady) => {
  if (databaseReady) {
    console.log("MongoDB connected for AdNode API.");
  } else {
    console.warn("MongoDB unavailable, starting AdNode API in local fallback mode.");
  }
});

app.listen(port, () => {
  console.log(`AdNode API listening on http://localhost:${port}`);
});

if (process.env.ADNODE_SETTLEMENT_REPLAY_INTERVAL_MS) {
  const intervalMs = Math.max(15_000, Number(process.env.ADNODE_SETTLEMENT_REPLAY_INTERVAL_MS));
  setInterval(() => {
    void replayPendingMeasurements().catch((error) => {
      console.error("AdNode settlement replay failed:", error instanceof Error ? error.message : error);
    });
  }, intervalMs);
}
