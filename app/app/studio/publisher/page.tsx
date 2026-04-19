"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { GlassPanel } from "@/components/ui/glass-panel";
import { PrimaryButton } from "@/components/ui/primary-button";
import { getJson } from "@/lib/adnode-api";

type SlotRow = {
  chainSlotId?: string;
  slotKey?: string;
  siteName?: string;
  category?: string;
  developer?: string;
  assignedCampaignId?: string;
};

export default function StudioPublisherHomePage() {
  const { address } = useAccount();
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

  const mySlots = useMemo(() => {
    const addr = (address ?? "").toLowerCase();
    if (!addr) return slots;
    return slots.filter((s) => String(s.developer ?? "").toLowerCase() === addr);
  }, [address, slots]);

  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text)] md:text-3xl">Publisher</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">Create placements on-chain, request access to campaigns, then embed ads on your site.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <GlassPanel className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Step 1</p>
          <h2 className="mt-1 font-display text-lg font-semibold text-[var(--text)]">Activate a placement</h2>
          <p className="mt-2 text-sm text-muted">Register your slot on-chain. We auto-index it for embeds.</p>
          <PrimaryButton href="/app/studio/publisher/slots" className="mt-4">
            Open slots
          </PrimaryButton>
        </GlassPanel>

        <GlassPanel className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Step 2</p>
          <h2 className="mt-1 font-display text-lg font-semibold text-[var(--text)]">Pick a campaign</h2>
          <p className="mt-2 text-sm text-muted">Browse campaigns, request access, then assign it to your placement.</p>
          <PrimaryButton href="/app/studio/publisher/campaigns" variant="secondary" className="mt-4">
            Browse campaigns
          </PrimaryButton>
        </GlassPanel>
      </div>

      <GlassPanel className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-[var(--text)]">Your placements</h3>
            <p className="mt-1 text-sm text-muted">Everything you registered shows up here after confirmation.</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/app/studio/publisher/embeds" className="text-accent hover:underline">
              View embeds
            </Link>
            <Link href="/app/studio/publisher/earnings" className="text-accent hover:underline">
              View earnings
            </Link>
          </div>
        </div>

        {mySlots.length === 0 ? (
          <p className="mt-4 text-sm text-muted">{address ? "No placements yet for this wallet." : "Connect your wallet to see your placements."}</p>
        ) : (
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {mySlots.slice(0, 6).map((s) => (
              <li key={String(s.slotKey ?? s.chainSlotId)}>
                <div className="rounded-panel border border-border bg-[color-mix(in_srgb,var(--surface-solid)_85%,transparent)] p-4">
                  <p className="text-sm font-medium text-[var(--text)]">{s.siteName || "Untitled placement"}</p>
                  <p className="mt-1 text-xs text-muted">
                    {s.category || "general"} ·{" "}
                    <span className="font-mono">{s.slotKey ? s.slotKey : s.chainSlotId ? `#${s.chainSlotId}` : "N/A"}</span>
                    {s.assignedCampaignId ? (
                      <>
                        {" "}
                        · running <span className="font-mono">#{s.assignedCampaignId}</span>
                      </>
                    ) : null}
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

