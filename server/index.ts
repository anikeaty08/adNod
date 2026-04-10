import "dotenv/config";
import express, { type Request, type Response } from "express";
import { createCampaign, getCampaigns, getDatabaseReady, sanitizeCampaignMetadata } from "./campaign-store.js";
import { parseMultipartUpload, uploadBufferToPinata } from "./pinata.js";
import { getAssistantReply, type AssistantMessage } from "./assistant.js";
import { buildEmbedFrameHtml, buildEmbedScript, getPublicCampaignById, getPublicCampaignBySlotId } from "./public-campaigns.js";
import { assignSlotCampaign, createSlot, getSlots, sanitizeSlotMetadata } from "./slot-store.js";
import { assertSignedRequest } from "./request-auth.js";

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
  const campaignId = Number(req.query.campaignId);
  const slotId = Number(req.query.slotId);
  const hasSlotId = Number.isFinite(slotId) && slotId > 0;
  const hasCampaignId = Number.isFinite(campaignId) && campaignId > 0;

  if (!hasSlotId && !hasCampaignId) {
    res
      .status(400)
      .type(mode === "frame" ? "text/html" : "application/javascript")
      .send(mode === "frame" ? "<p>AdNode slotId or campaignId is required.</p>" : "console.error('AdNode slotId or campaignId is required.');");
    return;
  }

  if (mode === "frame") {
    try {
      const campaign = hasSlotId ? await getPublicCampaignBySlotId(slotId) : await getPublicCampaignById(campaignId);
      res.type("text/html").send(buildEmbedFrameHtml(campaign));
    } catch (error) {
      res.status(404).type("text/html").send(`<p>${error instanceof Error ? error.message : "Campaign not found."}</p>`);
    }
    return;
  }

  const origin = `${req.protocol}://${req.get("host")}`;
  res.type("application/javascript").send(buildEmbedScript(origin, hasSlotId ? { slotId } : { campaignId }));
});

app.get("/api/embed.js", async (req, res) => {
  const campaignId = Number(req.query.campaignId);
  const slotId = Number(req.query.slotId);
  const hasSlotId = Number.isFinite(slotId) && slotId > 0;
  const hasCampaignId = Number.isFinite(campaignId) && campaignId > 0;

  if (!hasSlotId && !hasCampaignId) {
    res.status(400).type("application/javascript").send("console.error('AdNode slotId or campaignId is required.');");
    return;
  }

  const origin = `${req.protocol}://${req.get("host")}`;
  res.type("application/javascript").send(buildEmbedScript(origin, hasSlotId ? { slotId } : { campaignId }));
});

app.get("/api/embed-frame", async (req, res) => {
  const campaignId = Number(req.query.campaignId);
  const slotId = Number(req.query.slotId);
  const hasSlotId = Number.isFinite(slotId) && slotId > 0;
  const hasCampaignId = Number.isFinite(campaignId) && campaignId > 0;

  if (!hasSlotId && !hasCampaignId) {
    res.status(400).type("text/html").send("<p>AdNode slotId or campaignId is required.</p>");
    return;
  }

  try {
    const campaign = hasSlotId ? await getPublicCampaignBySlotId(slotId) : await getPublicCampaignById(campaignId);
    res.type("text/html").send(buildEmbedFrameHtml(campaign));
  } catch (error) {
    res.status(404).type("text/html").send(`<p>${error instanceof Error ? error.message : "Campaign not found."}</p>`);
  }
});

app.post("/api/campaigns", async (req, res) => {
  const payload = sanitizeCampaignMetadata(req.body as Record<string, unknown>);

  try {
    await assertSignedRequest(req.headers, "campaigns:create", payload);
  } catch (error) {
    res.status(401).json({ error: error instanceof Error ? error.message : "Unauthorized request." });
    return;
  }

  const campaign = await createCampaign(payload);
  res.status(201).json(campaign);
});

app.post("/api/slots", async (req, res) => {
  const payload = sanitizeSlotMetadata(req.body as Record<string, unknown>);

  try {
    await assertSignedRequest(req.headers, "slots:create", payload);
  } catch (error) {
    res.status(401).json({ error: error instanceof Error ? error.message : "Unauthorized request." });
    return;
  }

  const slot = await createSlot(payload);
  res.status(201).json(slot);
});

async function handleSlotAssignment(req: Request, res: Response) {
  const payload = { assignedCampaignId: String((req.body as Record<string, unknown>)?.assignedCampaignId ?? "") };
  const chainSlotId = String(req.params.chainSlotId ?? req.query.chainSlotId ?? "");

  try {
    await assertSignedRequest(req.headers, "slots:assign", payload);
  } catch (error) {
    res.status(401).json({ error: error instanceof Error ? error.message : "Unauthorized request." });
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
