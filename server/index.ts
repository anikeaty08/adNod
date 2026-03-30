import "dotenv/config";
import express from "express";
import { connectDatabase } from "./db";
import { CampaignModel } from "./models/Campaign";

const app = express();
app.use(express.json());
const memoryCampaigns: Record<string, unknown>[] = [];
let databaseReady = false;

app.get("/health", async (_req, res) => {
  res.json({ ok: true, service: "adnode-api", databaseReady });
});

app.get("/api/campaigns", async (_req, res) => {
  if (!databaseReady) {
    res.json(memoryCampaigns);
    return;
  }

  const campaigns = await CampaignModel.find().sort({ createdAt: -1 }).lean();
  res.json(campaigns);
});

app.post("/api/campaigns", async (req, res) => {
  if (!databaseReady) {
    const localCampaign = {
      ...req.body,
      _id: `local-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    memoryCampaigns.unshift(localCampaign);
    res.status(201).json(localCampaign);
    return;
  }

  const campaign = await CampaignModel.create(req.body);
  res.status(201).json(campaign);
});

const port = Number(process.env.PORT || 4000);

connectDatabase()
  .then(() => {
    databaseReady = true;
    console.log("MongoDB connected for AdNode API.");
  })
  .catch((error) => {
    console.warn("MongoDB unavailable, starting AdNode API in local fallback mode:", error.message);
  });

app.listen(port, () => {
  console.log(`AdNode API listening on http://localhost:${port}`);
});
