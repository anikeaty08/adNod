import type { IncomingMessage, ServerResponse } from "node:http";
import "dotenv/config";
import { replayPendingMeasurements } from "../../server/settlement-service.js";
import { assertSignedRequest } from "../../server/request-auth.js";
import { readJsonBody } from "../../server/http-body.js";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  let payload: Record<string, unknown>;
  try {
    payload = await readJsonBody(req);
  } catch (error) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Invalid request body." }));
    return;
  }

  try {
    await assertSignedRequest(req.headers, "settlement:replay", payload);
  } catch (error) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Unauthorized request." }));
    return;
  }

  try {
    const summary = await replayPendingMeasurements();
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, ...summary }));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Settlement replay failed." }));
  }
}
