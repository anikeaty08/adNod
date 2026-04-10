import type { IncomingMessage, ServerResponse } from "node:http";
import "dotenv/config";
import { buildEmbedFrameHtml, buildEmbedScript, createEmbedFramePayload, getPublicCampaignBySlotId } from "../server/public-campaigns.js";

function getUrl(req: IncomingMessage) {
  const host = req.headers.host || "localhost";
  return new URL(req.url || "/", `https://${host}`);
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = getUrl(req);
  const mode = url.searchParams.get("mode") || "script";
  const slotId = Number(url.searchParams.get("slotId"));
  const hasSlotId = Number.isFinite(slotId) && slotId > 0;

  if (!hasSlotId) {
    res.statusCode = 400;
    res.end(mode === "frame" ? "<p>AdNode slotId is required.</p>" : "console.error('AdNode slotId is required.');");
    return;
  }

  if (mode === "frame") {
    try {
      const campaign = await getPublicCampaignBySlotId(slotId);
      const origin = `${url.protocol}//${url.host}`;
      const payload = createEmbedFramePayload(campaign, origin);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.statusCode = 200;
      res.end(buildEmbedFrameHtml(payload.campaign, { origin: payload.origin, measurementToken: payload.measurementToken }));
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
  res.end(buildEmbedScript(origin, { slotId }));
}
