"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GripVertical, MessageCircle, Send, X } from "lucide-react";
import { postAssistantChat } from "@/lib/adnode-api";

type Msg = { role: "user" | "assistant"; content: string };

/** Stored as distance from viewport right / bottom (px) — stable when resizing. */
const POS_KEY = "adnode_help_chat_pos_v2";
const MARGIN = 12;
const DEFAULT_RIGHT = 20;
const DEFAULT_BOTTOM = 20;
const DRAG_THRESHOLD = 6;

function readSavedPos(): { right: number; bottom: number } {
  if (typeof window === "undefined") return { right: DEFAULT_RIGHT, bottom: DEFAULT_BOTTOM };
  try {
    const raw = localStorage.getItem(POS_KEY);
    if (!raw) return { right: DEFAULT_RIGHT, bottom: DEFAULT_BOTTOM };
    const j = JSON.parse(raw) as { right?: number; bottom?: number };
    return {
      right: Number.isFinite(Number(j.right)) ? Number(j.right) : DEFAULT_RIGHT,
      bottom: Number.isFinite(Number(j.bottom)) ? Number(j.bottom) : DEFAULT_BOTTOM,
    };
  } catch {
    return { right: DEFAULT_RIGHT, bottom: DEFAULT_BOTTOM };
  }
}

export function HelpChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "assistant", content: "Ask anything about AdNode — campaigns, embeds, claims, or the API." },
  ]);
  const [busy, setBusy] = useState(false);
  const [pos, setPos] = useState({ right: DEFAULT_RIGHT, bottom: DEFAULT_BOTTOM });
  const endRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(pos);
  posRef.current = pos;

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originRight: number;
    originBottom: number;
    moved: boolean;
    source: "fab" | "header";
  } | null>(null);

  const suppressFabToggle = useRef(false);

  useEffect(() => {
    setPos(readSavedPos());
  }, []);

  const persistPos = useCallback((right: number, bottom: number) => {
    try {
      localStorage.setItem(POS_KEY, JSON.stringify({ right, bottom }));
    } catch {
      /* ignore */
    }
  }, []);

  const clampPos = useCallback((right: number, bottom: number) => {
    const w = typeof window !== "undefined" ? window.innerWidth : 1200;
    const h = typeof window !== "undefined" ? window.innerHeight : 800;
    const el = shellRef.current;
    const rw = el?.offsetWidth ?? 380;
    const rh = el?.offsetHeight ?? 72;
    const maxRight = Math.max(MARGIN, w - rw - MARGIN);
    const maxBottom = Math.max(MARGIN, h - rh - MARGIN);
    return {
      right: Math.min(maxRight, Math.max(MARGIN, right)),
      bottom: Math.min(maxBottom, Math.max(MARGIN, bottom)),
    };
  }, []);

  useEffect(() => {
    const onResize = () => {
      setPos((p) => clampPos(p.right, p.bottom));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampPos]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (Math.hypot(dx, dy) > DRAG_THRESHOLD) d.moved = true;
      // Pointer right → widget moves right → `right` CSS decreases
      const nextRight = d.originRight - dx;
      const nextBottom = d.originBottom - dy;
      setPos(clampPos(nextRight, nextBottom));
    };
    const onUp = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.pointerId) return;
      if (d.moved && d.source === "fab") suppressFabToggle.current = true;
      dragRef.current = null;
      document.body.style.removeProperty("user-select");
      const { right, bottom } = posRef.current;
      persistPos(right, bottom);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [clampPos, persistPos]);

  const startDrag = useCallback(
    (e: React.PointerEvent, source: "fab" | "header") => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const p = posRef.current;
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originRight: p.right,
        originBottom: p.bottom,
        moved: false,
        source,
      };
      document.body.style.userSelect = "none";
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const history = msgs.map((x) => ({ role: x.role, content: x.content }));
    setMsgs((m) => [...m, { role: "user", content: text }]);
    setBusy(true);
    try {
      const res = await postAssistantChat<{ reply?: string; error?: string }>({ prompt: text, history });
      const reply = res.reply ?? (res as { error?: string }).error;
      setMsgs((m) => [...m, { role: "assistant", content: reply || "No reply." }]);
    } catch (e) {
      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          content: e instanceof Error ? e.message : "Chat failed. Set GROQ_API_KEY for AI, or rely on FAQ matches.",
        },
      ]);
    } finally {
      setBusy(false);
      queueMicrotask(() => endRef.current?.scrollIntoView({ behavior: "smooth" }));
    }
  }, [busy, input, msgs]);

  const onFabClick = useCallback(() => {
    if (suppressFabToggle.current) {
      suppressFabToggle.current = false;
      return;
    }
    setOpen((v) => !v);
  }, []);

  return (
    <>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-[8990] cursor-pointer border-0 bg-black/35 p-0"
          aria-label="Close help chat"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div
        ref={shellRef}
        className="pointer-events-none fixed z-[9000] flex flex-col items-end gap-3"
        style={{
          right: pos.right,
          bottom: pos.bottom,
        }}
      >
        <div className="pointer-events-auto flex flex-col items-end gap-3">
          {open ? (
            <div className="flex h-[min(520px,70vh)] w-[min(380px,92vw)] flex-col overflow-hidden rounded-2xl border border-border bg-[var(--surface-solid)] shadow-2xl ring-1 ring-black/10">
              <div
                role="toolbar"
                aria-label="Move chat"
                onPointerDown={(e) => startDrag(e, "header")}
                className="flex shrink-0 cursor-grab touch-none select-none items-center gap-2 border-b border-border bg-[color-mix(in_srgb,var(--surface-solid)_96%,var(--accent)_4%)] px-3 py-2.5 active:cursor-grabbing"
              >
                <GripVertical size={18} className="shrink-0 text-muted" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-sm font-semibold text-[var(--text)]">AdNode help</p>
                  <p className="text-xs text-muted">Drag to reposition</p>
                </div>
              </div>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-sm">
                {msgs.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[95%] rounded-xl px-3 py-2 whitespace-pre-wrap ${
                      m.role === "user" ? "ml-auto bg-accent/25 text-[var(--text)]" : "mr-auto bg-[color-mix(in_srgb,var(--text)_8%,transparent)] text-muted"
                    }`}
                  >
                    {m.content}
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <div className="flex shrink-0 gap-2 border-t border-border p-2">
                <input
                  className="min-w-0 flex-1 rounded-xl border border-border bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:ring-2 focus:ring-accent/40"
                  placeholder="Ask anything…"
                  value={input}
                  disabled={busy}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void send()}
                />
                <button
                  type="button"
                  className="rounded-xl bg-accent px-3 py-2 text-[var(--bg)] disabled:opacity-40"
                  disabled={busy}
                  onClick={() => void send()}
                  aria-label="Send"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onPointerDown={(e) => startDrag(e, "fab")}
            onClick={onFabClick}
            className="flex h-14 w-14 shrink-0 cursor-grab touch-none select-none items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--accent)_50%,transparent)] bg-[color-mix(in_srgb,var(--accent)_25%,var(--bg))] text-[var(--text)] shadow-lg shadow-black/30 transition hover:scale-[1.03] active:cursor-grabbing active:scale-95"
            aria-label={open ? "Close help chat" : "Open help chat"}
          >
            {open ? <X size={22} /> : <MessageCircle size={22} />}
          </button>
        </div>
      </div>
    </>
  );
}
