import type { IncomingMessage, ServerResponse } from "node:http";
import "dotenv/config";
import { assignSlotCampaign } from "../server/slot-store.js";
import { assertSignedRequest } from "../server/request-auth.js";
import { getAssignedCampaignId, getSlotDeveloper } from "../server/chain-state.js";

async function readBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

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
  const body = (await readBody(req)) as Record<string, unknown>;
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
