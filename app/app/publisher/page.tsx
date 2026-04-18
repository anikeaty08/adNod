"use client";

import { PublisherPanel } from "@/components/studio/publisher-panel";
import { GradientMesh } from "@/components/ui/gradient-mesh";

export default function PublisherPage() {
  return (
    <>
      <GradientMesh />
      <div className="pb-12 pt-4">
        <header className="mb-8 max-w-2xl">
          <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text)] md:text-3xl">Publisher</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            For sites and apps that show ads: register a slot, assign a matching campaign, then paste the embed for your stack
            (HTML, React, Next, or script).
          </p>
        </header>
        <PublisherPanel />
      </div>
    </>
  );
}
