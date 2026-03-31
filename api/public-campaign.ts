import type { IncomingMessage, ServerResponse } from "node:http";
import "dotenv/config";
import { getPublicCampaignById } from "../server/public-campaigns.js";

function getUrl(req: IncomingMessage) {
  return new URL(req.url || "/", "http://localhost");
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const url = getUrl(req);
  const campaignId = Number(url.searchParams.get("campaignId") ?? url.searchParams.get("id"));

  if (!Number.isFinite(campaignId) || campaignId < 1) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "campaignId is required." }));
    return;
  }

  try {
    const campaign = await getPublicCampaignById(campaignId);
    res.statusCode = 200;
    res.end(JSON.stringify(campaign));
  } catch (error) {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Campaign not found." }));
  }
}
