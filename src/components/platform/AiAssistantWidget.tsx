import { useState } from "react";
import { Bot, MessageSquare, X } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { askAdNodeAssistant } from "@/lib/api";

const quickPrompts = [
  "What is AdNode?",
  "Who can see my campaign budget?",
  "How do publishers earn?",
];

export function AiAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState(quickPrompts[0]);
  const [reply, setReply] = useState("");
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Ask anything about AdNode, FHE privacy, campaigns, or publisher earnings.");

  const handleAsk = async () => {
    setLoading(true);
    setStatus("Thinking...");

    try {
      const response = await askAdNodeAssistant(prompt);
      setReply(response.reply);
      setModel(response.model);
      setStatus("Live response generated through Groq.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Assistant request failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {open ? (
        <div className="fixed bottom-5 right-5 z-50 w-[min(92vw,420px)] rounded-[28px] border border-white/20 bg-white/90 p-5 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <div className="rounded-2xl bg-sky-500/10 p-2 text-sky-600 dark:text-sky-300">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-display text-xl font-semibold">AdNode assistant</h3>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{model || "Groq connected"}</p>
                </div>
              </div>
            </div>
            <button type="button" className="rounded-full p-2 text-muted-foreground transition hover:bg-white/60 hover:text-foreground dark:hover:bg-white/10" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {quickPrompts.map((item) => (
              <button
                key={item}
                type="button"
                className={`rounded-full px-3 py-2 text-xs transition ${
                  prompt === item ? "bg-sky-500 text-white" : "bg-white/70 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10"
                }`}
                onClick={() => setPrompt(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <label className="mt-4 block space-y-2 text-sm">
            <span>Ask for help</span>
            <textarea
              className="min-h-28 w-full rounded-2xl border bg-white/80 px-4 py-3 dark:bg-slate-950/50"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Ask about encrypted budgets, auctions, creatives, or wallet setup."
            />
          </label>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">{status}</p>
            <Button type="button" onClick={() => void handleAsk()} disabled={loading || !prompt.trim()}>
              {loading ? "Asking..." : "Ask"}
            </Button>
          </div>
          <div className="mt-4 rounded-[24px] bg-white/70 p-4 dark:bg-white/5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Reply</p>
            <p className="mt-3 whitespace-pre-wrap text-sm">{reply}</p>
          </div>
        </div>
      ) : null}
      <button
        type="button"
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-3 rounded-full bg-sky-500 px-5 py-4 text-sm font-semibold text-white shadow-2xl transition hover:bg-sky-600"
        onClick={() => setOpen(true)}
      >
        <MessageSquare className="h-4 w-4" />
        Ask AdNode AI
      </button>
    </>
  );
}
