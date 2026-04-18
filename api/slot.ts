import type { IncomingMessage, ServerResponse } from "node:http";
import "dotenv/config";
import { assignSlotCampaign } from "../server/slot-store.js";
import { assertSignedRequest } from "../server/request-auth.js";
import { getAssignedCampaignId, getSlotDeveloper } from "../server/chain-state.js";
import { readJsonBody } from "../server/http-body.js";

function getUrl(req: IncomingMessage) {
  return new URL(req.url || "/", "http://localhost");
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const url = getUrl(req);
  const chainSlotId = url.searchParams.get("chainSlotId") ?? "";
  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Invalid request body." }));
    return;
  }
  const payload = { assignedCampaignId: String(body.assignedCampaignId ?? "") };
  let signerAddress = "";

  try {
    signerAddress = await assertSignedRequest(req.headers, "slots:assign", payload);
  } catch (error) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Unauthorized request." }));
    return;
  }

  try {
    const onchainDeveloper = await getSlotDeveloper(chainSlotId);
    const onchainAssignment = await getAssignedCampaignId(chainSlotId);

    if (onchainDeveloper.toLowerCase() !== signerAddress) {
      throw new Error("Signed wallet does not own this on-chain slot.");
    }

    if (onchainAssignment !== payload.assignedCampaignId) {
      throw new Error("On-chain slot assignment does not match the requested campaign.");
    }
  } catch (error) {
    res.statusCode = 409;
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Slot assignment verification failed." }));
    return;
  }

  const updated = await assignSlotCampaign(chainSlotId, payload.assignedCampaignId);

  if (!updated) {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: "Slot not found." }));
    return;
  }

  res.statusCode = 200;
  res.end(JSON.stringify(updated));
}
