import "dotenv/config";
import express from "express";
import { createCampaign, getCampaigns, getDatabaseReady, sanitizeCampaignMetadata } from "./campaign-store.js";
import { parseMultipartUpload, uploadBufferToPinata } from "./pinata.js";
import { getAssistantReply, type AssistantMessage } from "./assistant.js";

const app = express();
const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
]);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.has(origin)) {
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

app.post("/api/campaigns", async (req, res) => {
  const campaign = await createCampaign(sanitizeCampaignMetadata(req.body as Record<string, unknown>));
  res.status(201).json(campaign);
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
