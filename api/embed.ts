import type { IncomingMessage, ServerResponse } from "node:http";
import "dotenv/config";
import { buildEmbedFrameHtml, buildEmbedScript, getPublicCampaignById } from "../server/public-campaigns.js";

function getUrl(req: IncomingMessage) {
  const host = req.headers.host || "localhost";
  return new URL(req.url || "/", `https://${host}`);
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = getUrl(req);
  const mode = url.searchParams.get("mode") || "script";
  const campaignId = Number(url.searchParams.get("campaignId"));

  if (!Number.isFinite(campaignId) || campaignId < 1) {
    res.statusCode = 400;
    res.end(mode === "frame" ? "<p>AdNode campaignId is required.</p>" : "console.error('AdNode campaignId is required.');");
    return;
  }

  if (mode === "frame") {
    try {
      const campaign = await getPublicCampaignById(campaignId);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.statusCode = 200;
      res.end(buildEmbedFrameHtml(campaign));
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
  res.end(buildEmbedScript(origin, campaignId).replace("/api/embed-frame?", "/api/embed?mode=frame&"));
}
