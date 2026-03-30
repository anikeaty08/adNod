import "dotenv/config";
import express from "express";
import { createCampaign, getCampaigns, getDatabaseReady, sanitizeCampaignMetadata } from "./campaign-store";

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
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    res.status(503).json({ error: "Groq assistant is not configured yet." });
    return;
  }

  const prompt = String((req.body as Record<string, unknown>)?.prompt ?? "").trim();
  if (!prompt) {
    res.status(400).json({ error: "Prompt is required." });
    return;
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are the AdNode AI assistant. Help users understand AdNode, FHE privacy, Hosters, Developers, campaigns, creatives, and platform workflow. Be concise, accurate, and product-aware.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    res.status(502).json({ error: "Groq request failed." });
    return;
  }

  const completion = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
  };

  res.json({
    reply: completion.choices?.[0]?.message?.content ?? "",
    model: completion.model ?? process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  });
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
