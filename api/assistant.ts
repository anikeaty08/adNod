import type { IncomingMessage, ServerResponse } from "node:http";
import "dotenv/config";

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

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.statusCode = 503;
    res.end(JSON.stringify({ error: "Groq assistant is not configured yet." }));
    return;
  }

  const body = (await readBody(req)) as Record<string, unknown>;
  const prompt = String(body.prompt ?? "").trim();
  if (!prompt) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "Prompt is required." }));
    return;
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            [
              "You are the AdNode AI assistant.",
              "Use AdNode terminology correctly:",
              "- Hoster = advertiser",
              "- Developer = publisher",
              "- Developers earn revenue by displaying campaigns, not Hosters.",
              "AdNode is a decentralized advertising network on Fhenix Arbitrum Sepolia using CoFHE for encrypted financial data.",
              "Public data: creative URI and category.",
              "Encrypted data: budget, CPC, impressions, clicks, earnings.",
              "Answer clearly, accurately, and briefly.",
              "Do not invent features or mix up user roles.",
              "If the user asks who earns from ad placements, the answer is Developers (publishers).",
            ].join(" "),
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_completion_tokens: 300,
    }),
  });

  if (!response.ok) {
    res.statusCode = 502;
    res.end(JSON.stringify({ error: "Groq request failed." }));
    return;
  }

  const completion = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    model?: string;
  };

  res.statusCode = 200;
  res.end(
    JSON.stringify({
      reply: completion.choices?.[0]?.message?.content ?? "",
      model: completion.model ?? process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
    }),
  );
}
