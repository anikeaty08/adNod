import "dotenv/config";
import express from "express";
import { createCampaign, getCampaigns, getDatabaseReady, sanitizeCampaignMetadata } from "./campaign-store.js";
import { parseMultipartUpload, uploadBufferToPinata } from "./pinata.js";
import { getAssistantReply, type AssistantMessage } from "./assistant.js";
import { buildEmbedFrameHtml, buildEmbedScript, getPublicCampaignById } from "./public-campaigns.js";
import { assignSlotCampaign, createSlot, getSlots, sanitizeSlotMetadata } from "./slot-store.js";

const app = express();
const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && localhostOriginPattern.test(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
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

app.get("/api/embed.js", async (req, res) => {
  const campaignId = Number(req.query.campaignId);

  if (!Number.isFinite(campaignId) || campaignId < 1) {
    res.status(400).type("application/javascript").send("console.error('AdNode campaignId is required.');");
    return;
  }

  const origin = `${req.protocol}://${req.get("host")}`;
  res.type("application/javascript").send(buildEmbedScript(origin, campaignId));
});

app.get("/api/embed-frame", async (req, res) => {
  const campaignId = Number(req.query.campaignId);

  if (!Number.isFinite(campaignId) || campaignId < 1) {
    res.status(400).type("text/html").send("<p>AdNode campaignId is required.</p>");
    return;
  }

  try {
    const campaign = await getPublicCampaignById(campaignId);
    res.type("text/html").send(buildEmbedFrameHtml(campaign));
  } catch (error) {
    res.status(404).type("text/html").send(`<p>${error instanceof Error ? error.message : "Campaign not found."}</p>`);
  }
});

app.post("/api/campaigns", async (req, res) => {
  const campaign = await createCampaign(sanitizeCampaignMetadata(req.body as Record<string, unknown>));
  res.status(201).json(campaign);
});

app.post("/api/slots", async (req, res) => {
  const slot = await createSlot(sanitizeSlotMetadata(req.body as Record<string, unknown>));
  res.status(201).json(slot);
});

app.patch("/api/slots/:chainSlotId", async (req, res) => {
  const updated = await assignSlotCampaign(req.params.chainSlotId, String((req.body as Record<string, unknown>)?.assignedCampaignId ?? ""));

  if (!updated) {
    res.status(404).json({ error: "Slot not found." });
    return;
  }

  res.json(updated);
});

app.post("/api/assistant", async (req, res) => {
  const body = (req.body as Record<string, unknown>) ?? {};
  const prompt = String(body.prompt ?? "").trim();
  const history = Array.isArray(body.history) ? (body.history as AssistantMessage[]) : [];

  if (!prompt) {
    res.status(400).json({ error: "Prompt is required." });
    return;
  }

  try {
    const completion = await getAssistantReply(prompt, history);
    res.json(completion);
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "Assistant request failed." });
  }
});

app.post("/api/uploads/creative", async (req, res) => {
  try {
    const file = await parseMultipartUpload(req);
    const uri = await uploadBufferToPinata(file);
    res.status(201).json({ uri });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : "Creative upload failed." });
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
