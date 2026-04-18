import type { IncomingMessage, ServerResponse } from "node:http";
import "dotenv/config";
import { createCampaign, getCampaigns, sanitizeCampaignMetadata } from "../server/campaign-store.js";
import { assertSignedRequest } from "../server/request-auth.js";
import { getCampaignHoster } from "../server/chain-state.js";
import { readJsonBody } from "../server/http-body.js";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Content-Type", "application/json");

  if (req.method === "GET") {
    const campaigns = await getCampaigns();
    res.statusCode = 200;
    res.end(JSON.stringify(campaigns));
    return;
  }

  if (req.method === "POST") {
    let payload: Record<string, unknown>;
    try {
      payload = await readJsonBody(req);
    } catch (error) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Invalid request body." }));
      return;
    }
    const candidate = sanitizeCampaignMetadata({
      ...payload,
      advertiser: String(payload.advertiser ?? ""),
    });
    let signerAddress = "";

    try {
      signerAddress = await assertSignedRequest(req.headers, "campaigns:create", candidate);
    } catch (error) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Unauthorized request." }));
      return;
    }

    const sanitized = sanitizeCampaignMetadata({
      ...candidate,
      advertiser: signerAddress,
    });

    try {
      const onchainHoster = await getCampaignHoster(sanitized.chainCampaignId);
      if (onchainHoster.toLowerCase() !== signerAddress) {
        throw new Error("Signed wallet does not own this on-chain campaign.");
      }
    } catch (error) {
      res.statusCode = 409;
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Campaign ownership check failed." }));
      return;
    }

    const campaign = await createCampaign(sanitized);
    res.statusCode = 201;
    res.end(JSON.stringify(campaign));
    return;
  }

  res.setHeader("Allow", "GET, POST");
  res.statusCode = 405;
  res.end(JSON.stringify({ error: "Method not allowed" }));
}
