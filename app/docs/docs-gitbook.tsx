"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/layout/nav";
import { GradientMesh } from "@/components/ui/gradient-mesh";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Block =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "code"; title?: string; code: string }
  | { type: "cta"; title?: string; items: Array<{ href: string; label: string; kind?: "primary" | "secondary" }> };

const sections: { id: string; title: string; blocks: Block[] }[] = [
  {
    id: "get-started",
    title: "Get started",
    blocks: [
      {
        type: "p",
        text: "AdNode runs on Fhenix Arbitrum Sepolia with CoFHE.",
      },
      {
        type: "p",
        text: "Roles: Hoster (advertiser) funds campaigns. Developer (publisher) earns from ad placements.",
      },
      {
        type: "cta",
        title: "Pick your path",
        items: [
          { href: "/app/studio/publisher", label: "Publisher / developer", kind: "primary" },
          { href: "/app/studio", label: "Studio", kind: "secondary" },
        ],
      },
      {
        type: "ul",
        items: [
          "Publishers: activate a placement on-chain, assign a matching campaign, paste an embed snippet.",
          "Advertisers: create + fund campaigns from Studio; they become discoverable automatically.",
        ],
      },
    ],
  },
  {
    id: "publisher-quickstart",
    title: "Publisher quickstart",
    blocks: [
      {
        type: "p",
        text: "Activate a placement on-chain, get approved for a campaign, then embed it on your site.",
      },
      {
        type: "ul",
        items: [
          "Open Publisher -> Slots -> Activate placement (wallet tx).",
          "Request access for a campaign id (wallet tx).",
          "After machine approval, assign the campaign to your placement (wallet tx).",
          "Open Embeds -> pick your placement -> copy code for your stack.",
        ],
      },
      {
        type: "code",
        title: "Embed (script, simplest)",
        code: `<script async src="YOUR_ORIGIN/api/embed?slotKey=YOUR_SLOT_KEY"></script>`,
      },
      {
        type: "code",
        title: "Embed (iframe)",
        code: `<iframe
  src="YOUR_ORIGIN/api/embed?mode=frame&slotKey=YOUR_SLOT_KEY"
  title="AdNode placement"
  loading="lazy"
  style="width:100%;min-height:280px;border:0;border-radius:20px"
/>`,
      },
    ],
  },
  {
    id: "publisher-guides",
    title: "Publisher guides",
    blocks: [
      {
        type: "ul",
        items: [
          "Categories help organize placements and match campaigns (optional for now).",
          "Embeds work on any site: plain script tag, iframe, React, or Next.js client component.",
          "Placements are owned by your wallet on-chain; earnings accrue to that wallet.",
        ],
      },
    ],
  },
  {
    id: "embed-reference",
    title: "Embed reference",
    blocks: [
      {
        type: "p",
        text: "All embeds load from your AdNode deployment origin. Use slotKey if available (recommended). slotId also works, but slotKey is nicer to share publicly.",
      },
      {
        type: "code",
        title: "Script (slotKey)",
        code: `<script async src="YOUR_ORIGIN/api/embed?slotKey=YOUR_SLOT_KEY"></script>`,
      },
      {
        type: "code",
        title: "Script (slotId)",
        code: `<script async src="YOUR_ORIGIN/api/embed?slotId=123"></script>`,
      },
      {
        type: "code",
        title: "React / Next.js (client component pattern)",
        code: `'use client';

import { useEffect, useRef } from "react";

export function AdNodePlacement() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    const frame = document.createElement("iframe");
    frame.src = "YOUR_ORIGIN/api/embed?mode=frame&slotKey=YOUR_SLOT_KEY";
    frame.loading = "lazy";
    frame.style.width = "100%";
    frame.style.minHeight = "280px";
    frame.style.border = "0";
    frame.style.borderRadius = "20px";
    el.appendChild(frame);
  }, []);
  return <div ref={ref} data-adnode-slot="YOUR_SLOT_KEY" />;
}`,
      },
    ],
  },
  {
    id: "api-reference",
    title: "API reference",
    blocks: [
      {
        type: "p",
        text: "The UI uses these endpoints. Public reads are normal JSON; embeds are HTML/JS.",
      },
      {
        type: "ul",
        items: [
          "GET /api/campaigns -> list campaign metadata (Home + Studio lists).",
          "GET /api/slots -> list slot metadata (Publisher pages).",
          "GET /api/campaign?id=4 -> campaign metadata for a single id.",
          "GET /api/embed?mode=frame&slotKey=... -> hosted iframe HTML (embeds).",
          "GET /api/embed?slotKey=... -> JavaScript embed (default mode).",
        ],
      },
    ],
  },
  {
    id: "glossary",
    title: "Glossary",
    blocks: [
      {
        type: "ul",
        items: [
          "Campaign: an advertiser/hoster on-chain ad with public settlement terms.",
          "Placement / slot: a publisher/developer on-chain inventory unit owned by your wallet.",
          "slotKey: an unguessable public key that maps to your on-chain slot id for embeds.",
        ],
      },
    ],
  },
];

function CodeBlock({ title, code }: { title?: string; code: string }) {
  return (
    <div className="space-y-2">
      {title ? <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p> : null}
      <pre className="max-h-[min(420px,55vh)] overflow-auto rounded-xl border border-border bg-[color-mix(in_srgb,var(--text)_6%,var(--bg))] p-4 text-left text-[13px] leading-relaxed text-[var(--text)] shadow-inner">
        <code className="whitespace-pre font-mono">{code}</code>
      </pre>
    </div>
  );
}

function CallToAction({ title, items }: { title?: string; items: Array<{ href: string; label: string; kind?: "primary" | "secondary" }> }) {
  return (
    <div className="rounded-2xl border border-border bg-[color-mix(in_srgb,var(--surface-solid)_92%,transparent)] p-4">
      {title ? <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              it.kind === "primary"
                ? "bg-accent text-[var(--bg)] hover:bg-[color-mix(in_srgb,var(--accent)_88%,#000)]"
                : "border border-border text-[var(--text)] hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]"
            }`}
          >
            {it.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function DocsGitbook() {
  const [active, setActive] = useState(0);
  const articleRef = useRef<HTMLElement>(null);

  const scrollTo = useCallback((idx: number) => {
    const i = Math.max(0, Math.min(sections.length - 1, idx));
    setActive(i);
    const el = document.getElementById(sections[i].id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const id = e.target.id;
          const idx = sections.findIndex((s) => s.id === id);
          if (idx >= 0) setActive(idx);
        }
      },
      { rootMargin: "-40% 0px -45% 0px", threshold: 0 },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <GradientMesh />
      <Nav />
      <div className="container flex min-h-[calc(100vh-8rem)] flex-col gap-8 py-8 pb-32 md:flex-row">
        <div className="flex gap-2 overflow-x-auto pb-2 md:hidden">
          {sections.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${
                active === i ? "border-accent bg-accent/15 text-[var(--text)]" : "border-border text-muted"
              }`}
              onClick={() => scrollTo(i)}
            >
              {s.title}
            </button>
          ))}
        </div>
        <aside className="hidden w-56 shrink-0 md:block">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Docs</p>
          <nav className="sticky top-24 mt-4 space-y-1 border-l border-border pl-3">
            {sections.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollTo(i)}
                className={`block w-full rounded-r-md py-1.5 pl-2 text-left text-sm transition-colors ${
                  active === i ? "border-l-2 border-accent bg-accent/10 font-medium text-[var(--text)]" : "text-muted hover:text-[var(--text)]"
                }`}
                style={{ marginLeft: active === i ? "-3px" : 0 }}
              >
                {s.title}
              </button>
            ))}
          </nav>

          <Link href="/app/studio/publisher" className="mt-8 inline-block text-sm text-accent hover:underline">
            Open Publisher
          </Link>
          <Link href="/app/studio" className="mt-2 block text-sm text-accent hover:underline">
            Open Studio
          </Link>
        </aside>

        <article ref={articleRef} className="min-w-0 max-w-3xl flex-1">
          <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--text)]">Documentation</h1>
          <p className="mt-2 text-sm text-muted">A short \"how to use it\" guide for publishers and advertisers.</p>

          <div className="mt-10 space-y-16">
            {sections.map((s) => (
              <section key={s.id} id={s.id} className="scroll-mt-28">
                <h2 className="font-display text-xl font-semibold text-[var(--text)]">{s.title}</h2>
                <div className="mt-4 space-y-6 text-sm leading-relaxed text-muted">
                  {s.blocks.map((b, j) =>
                    b.type === "p" ? (
                      <p key={`${s.id}-p-${j}`}>{b.text}</p>
                    ) : b.type === "ul" ? (
                      <ul key={`${s.id}-ul-${j}`} className="list-disc space-y-2 pl-5">
                        {(b.items ?? []).map((it, k) => (
                          <li key={k}>{it}</li>
                        ))}
                      </ul>
                    ) : b.type === "code" ? (
                      <CodeBlock key={`${s.id}-code-${j}`} title={b.title} code={b.code} />
                    ) : (
                      <CallToAction key={`${s.id}-cta-${j}`} title={b.title} items={b.items} />
                    ),
                  )}
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] backdrop-blur-md">
        <div className="container flex items-center justify-between gap-4 py-3">
          <button
            type="button"
            disabled={active <= 0}
            onClick={() => scrollTo(active - 1)}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-40 hover:bg-accent/10"
          >
            <ChevronLeft size={18} /> Previous
          </button>
          <p className="hidden text-center text-xs text-muted sm:block">
            {active + 1} / {sections.length} · {sections[active]?.title}
          </p>
          <button
            type="button"
            disabled={active >= sections.length - 1}
            onClick={() => scrollTo(active + 1)}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-40 hover:bg-accent/10"
          >
            Next <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </>
  );
}
