import type { IncomingMessage, ServerResponse } from "node:http";
import "dotenv/config";
import { createCampaign, getCampaigns, sanitizeCampaignMetadata } from "../server/campaign-store.js";

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Content-Type", "application/json");

  if (req.method === "GET") {
    const campaigns = await getCampaigns();
    res.statusCode = 200;
    res.end(JSON.stringify(campaigns));
    return;
  }

  if (req.method === "POST") {
    const payload = (await readBody(req)) as Record<string, unknown>;
    const campaign = await createCampaign(sanitizeCampaignMetadata(payload));
    res.statusCode = 201;
    res.end(JSON.stringify(campaign));
    return;
  }

  res.setHeader("Allow", "GET, POST");
  res.statusCode = 405;
  res.end(JSON.stringify({ error: "Method not allowed" }));
}
