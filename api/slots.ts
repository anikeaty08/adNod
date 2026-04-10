import type { IncomingMessage, ServerResponse } from "node:http";
import "dotenv/config";
import { createSlot, getSlots, sanitizeSlotMetadata } from "../server/slot-store.js";
import { assertSignedRequest } from "../server/request-auth.js";
import { getSlotDeveloper } from "../server/chain-state.js";

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
    const slots = await getSlots();
    res.statusCode = 200;
    res.end(JSON.stringify(slots));
    return;
  }

  if (req.method === "POST") {
    const body = (await readBody(req)) as Record<string, unknown>;
    const candidate = sanitizeSlotMetadata({
      ...body,
      developer: String(body.developer ?? ""),
    });
    let signerAddress = "";

    try {
      signerAddress = await assertSignedRequest(req.headers, "slots:create", candidate);
    } catch (error) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Unauthorized request." }));
      return;
    }

    const sanitized = sanitizeSlotMetadata({
      ...candidate,
      developer: signerAddress,
    });

    try {
      const onchainDeveloper = await getSlotDeveloper(sanitized.chainSlotId);
      if (onchainDeveloper.toLowerCase() !== signerAddress) {
        throw new Error("Signed wallet does not own this on-chain slot.");
      }
    } catch (error) {
      res.statusCode = 409;
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Slot ownership check failed." }));
      return;
    }

    const slot = await createSlot(sanitized);
    res.statusCode = 201;
    res.end(JSON.stringify(slot));
    return;
  }

  res.setHeader("Allow", "GET, POST");
  res.statusCode = 405;
  res.end(JSON.stringify({ error: "Method not allowed" }));
}
