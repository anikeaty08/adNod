import { useEffect, useRef, useState } from "react";
import { Bot, MessageSquare, Send, X } from "lucide-react";
import { useWalletClient } from "wagmi";
import { Button } from "@/components/shared/Button";
import { askAdNodeAssistant, type AssistantChatTurn } from "@/lib/api";
import { useWallet } from "@/context/WalletContext";

const quickPrompts = ["What is AdNode?", "Who can see my campaign budget?", "How do publishers earn?"];

export function AiAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Ask anything about AdNode, FHE privacy, campaigns, or publisher earnings.");
  const [messages, setMessages] = useState<AssistantChatTurn[]>([
    {
      role: "assistant",
      content: "Ask anything about AdNode, encrypted campaigns, wallet setup, or publisher earnings.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const { connected, address } = useWallet();
  const { data: walletClient } = useWalletClient();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const handleAsk = async (nextPrompt?: string) => {
    const question = (nextPrompt ?? prompt).trim();
    if (!question) return;

    const history = messages.filter((message) => message.content.trim());
    setMessages((current) => [...current, { role: "user", content: question }]);
    setPrompt("");
    setLoading(true);
    setStatus("Thinking...");

    try {
      if (!connected || !address || !walletClient) {
        throw new Error("Connect your wallet before using the AdNode assistant.");
      }

      const response = await askAdNodeAssistant(question, history, {
        address,
        walletClient,
      });
      setMessages((current) => [...current, { role: "assistant", content: response.reply }]);
      setModel(response.model);
      setStatus(response.model === "AdNode FAQ" ? "Answered from AdNode FAQ." : "Live response generated through Groq.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Assistant request failed.";
      setMessages((current) => [...current, { role: "assistant", content: message }]);
      setStatus(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {open ? (
        <div className="fixed bottom-5 right-5 z-50 w-[min(94vw,430px)] rounded-[28px] border border-white/20 bg-white/90 p-5 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="rounded-2xl bg-sky-500/10 p-2 text-sky-600 dark:text-sky-300">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold">Support chat</h3>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{model || "AdNode live"}</p>
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
                className="rounded-full bg-white/70 px-3 py-2 text-xs transition hover:bg-white dark:bg-white/5 dark:hover:bg-white/10"
                onClick={() => void handleAsk(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div ref={scrollRef} className="mt-4 max-h-[48vh] space-y-3 overflow-y-auto pr-1">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "ml-8 bg-sky-500 text-white"
                    : "mr-8 bg-white/75 text-foreground dark:bg-white/5"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            ))}
            {loading ? (
              <div className="mr-8 rounded-2xl bg-white/75 px-4 py-3 text-sm text-muted-foreground dark:bg-white/5">Thinking...</div>
            ) : null}
          </div>

          <p className="mt-4 text-xs text-muted-foreground">{status}</p>

          <div className="mt-3 flex items-end gap-2">
            <label className="flex-1">
              <span className="sr-only">Ask for help</span>
              <textarea
                className="min-h-24 w-full rounded-2xl border bg-white/80 px-4 py-3 text-sm dark:bg-slate-950/50"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Ask about encrypted budgets, campaigns, creatives, or wallet setup."
              />
            </label>
            <Button type="button" onClick={() => void handleAsk()} disabled={loading || !prompt.trim()} className="h-11 px-4">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        aria-label="Open support chat"
        className="fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-sky-500 text-white shadow-2xl transition hover:bg-sky-600"
        onClick={() => setOpen(true)}
      >
        <MessageSquare className="h-5 w-5" />
      </button>
    </>
  );
}
