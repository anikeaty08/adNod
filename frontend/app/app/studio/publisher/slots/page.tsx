"use client";

import { PublisherPanel } from "@/components/studio/publisher-panel";

export default function StudioPublisherSlotsPage() {
  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text)] md:text-3xl">Publisher slots</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">Activate placements on-chain and assign campaigns.</p>
      </header>
      <PublisherPanel view="slots" />
    </div>
  );
}

