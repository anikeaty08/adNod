"use client";

import { AdvertiserPanel } from "@/components/studio/advertiser-panel";

export default function StudioCreatePage() {
  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text)] md:text-3xl">New campaign</h1>
        <p className="mt-1 text-sm text-muted">Creative, terms, wallet confirmation, then API sync.</p>
      </header>
      <AdvertiserPanel />
    </div>
  );
}
