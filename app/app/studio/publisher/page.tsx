"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GlassPanel } from "@/components/ui/glass-panel";
import { PrimaryButton } from "@/components/ui/primary-button";
import { getJson } from "@/lib/adnode-api";

type SlotRow = {
  chainSlotId?: string;
  slotKey?: string;
  siteName?: string;
  category?: string;
};

export default function StudioPublisherHomePage() {
  const [slots, setSlots] = useState<SlotRow[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const s = await getJson<SlotRow[]>("/api/slots");
        setSlots(Array.isArray(s) ? s : []);
      } catch {
        setSlots([]);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text)] md:text-3xl">Publisher</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">Create placements (slots) on-chain, then copy embed code for your stack.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <GlassPanel className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Step 1</p>
          <h2 className="mt-1 font-display text-lg font-semibold text-[var(--text)]">Activate a placement</h2>
          <p className="mt-2 text-sm text-muted">Register your slot on-chain. We auto-index it to the API for embeds.</p>
          <PrimaryButton href="/app/studio/publisher/slots" className="mt-4">
            Open slots
          </PrimaryButton>
        </GlassPanel>

        <GlassPanel className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Step 2</p>
          <h2 className="mt-1 font-display text-lg font-semibold text-[var(--text)]">Copy embed code</h2>
          <p className="mt-2 text-sm text-muted">Use the placement key (ungguessable) to embed on any site.</p>
          <PrimaryButton href="/app/studio/publisher/embeds" variant="secondary" className="mt-4">
            Open embeds
          </PrimaryButton>
        </GlassPanel>
      </div>

      <GlassPanel className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-[var(--text)]">Your placements</h3>
            <p className="mt-1 text-sm text-muted">Everything you registered shows up here after confirmation.</p>
          </div>
          <Link href="/app/studio/publisher/embeds" className="text-sm text-accent hover:underline">
            View embeds →
          </Link>
        </div>

        {slots.length === 0 ? (
          <p className="mt-4 text-sm text-muted">No placements yet.</p>
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {slots.slice(0, 6).map((s) => (
              <li key={String(s.slotKey ?? s.chainSlotId)}>
                <div className="rounded-panel border border-border bg-[color-mix(in_srgb,var(--surface-solid)_85%,transparent)] p-4">
                  <p className="text-sm font-medium text-[var(--text)]">{s.siteName || "Untitled placement"}</p>
                  <p className="mt-1 text-xs text-muted">
                    {s.category || "—"} · <span className="font-mono">{s.slotKey ? s.slotKey : `#${s.chainSlotId}`}</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>
    </div>
  );
}

