import { NextResponse } from "next/server";
import { getAssistantReply, type AssistantMessage } from "@/server/assistant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { prompt?: string; history?: Array<{ role: string; content: string }> };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prompt = String(body.prompt ?? "").trim();
  const history: AssistantMessage[] = Array.isArray(body.history)
    ? body.history.filter(
        (m): m is AssistantMessage =>
          m != null &&
          typeof m === "object" &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string",
      )
    : [];

  if (!prompt || prompt.length > 4000) {
    return NextResponse.json({ error: "Prompt is required (max 4000 chars)." }, { status: 400 });
  }

  try {
    const completion = await getAssistantReply(prompt, history);
    return NextResponse.json(completion);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Assistant request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
