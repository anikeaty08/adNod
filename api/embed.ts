import type { IncomingMessage, ServerResponse } from "node:http";
import "dotenv/config";
import { buildEmbedFrameHtml, buildEmbedScript, getPublicCampaignById, getPublicCampaignBySlotId } from "../server/public-campaigns.js";

function getUrl(req: IncomingMessage) {
  const host = req.headers.host || "localhost";
  return new URL(req.url || "/", `https://${host}`);
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = getUrl(req);
  const mode = url.searchParams.get("mode") || "script";
  const campaignId = Number(url.searchParams.get("campaignId"));
  const slotId = Number(url.searchParams.get("slotId"));
  const hasSlotId = Number.isFinite(slotId) && slotId > 0;
  const hasCampaignId = Number.isFinite(campaignId) && campaignId > 0;

  if (!hasSlotId && !hasCampaignId) {
    res.statusCode = 400;
    res.end(mode === "frame" ? "<p>AdNode slotId or campaignId is required.</p>" : "console.error('AdNode slotId or campaignId is required.');");
    return;
  }

  if (mode === "frame") {
    try {
      const campaign = hasSlotId ? await getPublicCampaignBySlotId(slotId) : await getPublicCampaignById(campaignId);
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
  res.end(buildEmbedScript(origin, hasSlotId ? { slotId } : { campaignId }));
}
