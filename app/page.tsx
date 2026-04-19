"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Nav } from "@/components/layout/nav";
import { GradientMesh } from "@/components/ui/gradient-mesh";
import { GlassPanel } from "@/components/ui/glass-panel";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Megaphone, LayoutTemplate, Wallet, Sparkles, Shield, Zap, BookOpen } from "lucide-react";
import { getJson } from "@/lib/adnode-api";
import { displayCampaignTitle } from "@/lib/campaign-title";

type CampaignCard = {
  chainCampaignId?: string;
  title?: string;
  category?: string;
  pricingModel?: string;
};

export default function LandingPage() {
  const [featured, setFeatured] = useState<CampaignCard[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const c = await getJson<CampaignCard[]>("/api/campaigns");
        setFeatured(Array.isArray(c) ? c.slice(0, 6) : []);
      } catch {
        setFeatured([]);
      }
    })();
  }, []);

  return (
    <>
      <GradientMesh />
      <Nav />
      <main className="container flex flex-col gap-20 pb-8 pt-8 md:gap-28 md:pt-14">
        <section className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-muted">Why we&apos;re building AdNode</p>
            <h1 className="font-display mt-4 text-4xl font-bold leading-[1.08] tracking-tight text-[var(--text)] md:text-5xl lg:text-[3.25rem]">
              Fair settlement without exposing your strategy.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted md:text-lg">
              Programmatic placements are stuck between opaque ad networks and fully public on-chain auctions. AdNode is a middle path:
              Fhenix-style confidential fields for budgets and bids, plus explicit CPC/CPM rules in wei so publishers and auditors see the same payout math.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <PrimaryButton href="/app/studio">
                <Megaphone size={18} /> Studio
              </PrimaryButton>
              <PrimaryButton href="/app/studio/publisher" variant="secondary">
                <LayoutTemplate size={18} /> Publisher
              </PrimaryButton>
              <PrimaryButton href="/app/studio/publisher/earnings" variant="ghost">
                <Wallet size={18} /> Earnings
              </PrimaryButton>
              <PrimaryButton href="/docs" variant="ghost">
                <BookOpen size={18} /> Docs
              </PrimaryButton>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <GlassPanel className="p-5">
              <Shield className="text-accent" size={26} strokeWidth={1.5} />
              <h3 className="font-display mt-3 text-lg font-semibold text-[var(--text)]">Confidential where it counts</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">Encrypted handles for economics; public terms for enforcement.</p>
            </GlassPanel>
            <GlassPanel className="p-5">
              <Zap className="text-accent2" size={26} strokeWidth={1.5} />
              <h3 className="font-display mt-3 text-lg font-semibold text-[var(--text)]">Built for real sites</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">Embeds, signed API, and a wallet-native fund & claim loop.</p>
            </GlassPanel>
            <GlassPanel className="p-5 sm:col-span-2">
              <Sparkles className="text-accent" size={26} strokeWidth={1.5} />
              <h3 className="font-display mt-3 text-lg font-semibold text-[var(--text)]">Modern product surface</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                A clean Studio and Publisher flow with embeds that work on real sites.
              </p>
            </GlassPanel>
          </div>
        </section>

        <section id="workflow" className="scroll-mt-24">
          <h2 className="font-display text-2xl font-bold text-[var(--text)] md:text-3xl">How teams use it</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted md:text-base">
            Two roles, two journeys — same chain and API. Connect wallet, pick your path, ship.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <GlassPanel className="p-6 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">Advertiser</p>
              <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted md:text-base">
                <li>Upload or link a creative.</li>
                <li>Set category and CPC/CPM terms.</li>
                <li>Confirm encryption + payment in the wallet.</li>
                <li>After confirmation, the campaign appears automatically.</li>
              </ol>
              <PrimaryButton href="/app/studio/create" className="mt-6">
                Start creating
              </PrimaryButton>
            </GlassPanel>
            <GlassPanel className="p-6 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent2">Publisher / developer</p>
              <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted md:text-base">
                <li>Register a slot with a matching category.</li>
                <li>Assign an approved campaign.</li>
                <li>Copy embed code (HTML, React, Next, or script).</li>
                <li>Track earnings and withdraw from Account when rules align.</li>
              </ol>
              <PrimaryButton href="/app/studio/publisher" variant="secondary" className="mt-6">
                Publisher
              </PrimaryButton>
            </GlassPanel>
          </div>
        </section>

        <section>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-[var(--text)]">Live campaigns</h2>
              <p className="mt-1 text-sm text-muted">Pulled from the AdNode API metadata store.</p>
            </div>
            <Link href="/docs" className="cursor-pointer text-sm text-accent hover:underline">
              Read docs →
            </Link>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.length === 0 ? (
              <GlassPanel className="p-5 sm:col-span-2 lg:col-span-3">
                <p className="text-sm text-muted">No public campaigns in the API yet — create one from Studio.</p>
              </GlassPanel>
            ) : (
              featured.map((c) => (
                  <GlassPanel key={String(c.chainCampaignId)} className="p-5">
                    <p className="font-mono text-xs text-muted">#{c.chainCampaignId}</p>
                    <p className="mt-1 font-display text-lg font-semibold text-[var(--text)]">
                      {displayCampaignTitle({ title: c.title ?? null, chainCampaignId: c.chainCampaignId ?? null })}
                    </p>
                    <p className="mt-1 text-sm text-muted">{c.category ?? "—"} · {c.pricingModel ?? "—"}</p>
                  </GlassPanel>
              ))
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-[color-mix(in_srgb,var(--surface-solid)_92%,var(--accent)_8%)] p-8 md:p-12">
          <h2 className="font-display text-2xl font-bold text-[var(--text)] md:text-3xl">Docs & support</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted md:text-base">
            Product documentation is laid out like GitBook: quick orientation for hosters and developers, finance rules, and API auth.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <PrimaryButton href="/docs">Open documentation</PrimaryButton>
          </div>
        </section>
      </main>
    </>
  );
}
