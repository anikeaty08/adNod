import type { IncomingMessage, ServerResponse } from "node:http";
import "dotenv/config";
import { createSlot, getSlots, sanitizeSlotMetadata } from "../server/slot-store.js";
import { assertSignedRequest } from "../server/request-auth.js";
import { getSlotDeveloper } from "../server/chain-state.js";
import { readJsonBody } from "../server/http-body.js";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Content-Type", "application/json");

  if (req.method === "GET") {
    const slots = await getSlots();
    res.statusCode = 200;
    res.end(JSON.stringify(slots));
    return;
  }

  if (req.method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Invalid request body." }));
      return;
    }
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
