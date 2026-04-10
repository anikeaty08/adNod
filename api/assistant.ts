import type { IncomingMessage, ServerResponse } from "node:http";
import "dotenv/config";
import { getAssistantReply, type AssistantMessage } from "../server/assistant.js";
import { assertSignedRequest } from "../server/request-auth.js";

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

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const body = (await readBody(req)) as Record<string, unknown>;
  const prompt = String(body.prompt ?? "").trim();
  const history = Array.isArray(body.history) ? (body.history as AssistantMessage[]) : [];

  if (!prompt) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "Prompt is required." }));
    return;
  }

  try {
    await assertSignedRequest(req.headers, "assistant:ask", { prompt, history });
    const completion = await getAssistantReply(prompt, history);
    res.statusCode = 200;
    res.end(JSON.stringify(completion));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Assistant request failed.";
    res.statusCode =
      message.toLowerCase().includes("authorization") || message.toLowerCase().includes("signature") || message.toLowerCase().includes("expired") ? 401 : 502;
    res.end(JSON.stringify({ error: message }));
  }
}
