import "dotenv/config";
import express from "express";
import { connectDatabase } from "./db";
import { CampaignModel } from "./models/Campaign";

const app = express();
app.use(express.json());

app.get("/health", async (_req, res) => {
  res.json({ ok: true, service: "adnode-api" });
});

app.get("/api/campaigns", async (_req, res) => {
  const campaigns = await CampaignModel.find().sort({ createdAt: -1 }).lean();
  res.json(campaigns);
});

app.post("/api/campaigns", async (req, res) => {
  const campaign = await CampaignModel.create(req.body);
  res.status(201).json(campaign);
});

const port = Number(process.env.PORT || 4000);

connectDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`AdNode API listening on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start AdNode API:", error);
    process.exit(1);
  });
