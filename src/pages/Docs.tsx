import { ArrowRight, BookOpenText, Code2, Copy, LayoutTemplate, MousePointerClick, Wallet2 } from "lucide-react";
import { useState } from "react";
import { SnippetGenerator } from "@/components/docs/SnippetGenerator";
import { SectionBadge } from "@/components/shared/SectionBadge";

const docLinks = [
  { id: "overview", label: "Overview" },
  { id: "developer-flow", label: "Developer Flow" },
  { id: "pick-campaign", label: "Pick A Campaign" },
  { id: "grab-snippet", label: "Grab A Snippet" },
  { id: "place-ad", label: "Place The Ad" },
  { id: "api-shape", label: "Hosted API Shape" },
  { id: "best-practices", label: "Best Practices" },
];

const hostedCommands = [
  "Open AdNode",
  "Connect wallet with WalletConnect",
  "Go to Developer workspace",
  "Open Marketplace",
  "Pick a live campaign",
  "Copy your integration snippet",
];

const htmlExample = `<div id="adnode-slot"></div>
<script async src="https://your-adnode-domain.com/api/embed.js?slotId=YOUR_SLOT_ID"></script>`;

const reactExample = `import { useEffect, useRef } from "react";

export function AdNodeBanner() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://your-adnode-domain.com/api/embed.js?slotId=YOUR_SLOT_ID";
    ref.current?.appendChild(script);

    return () => script.remove();
  }, []);

  return <div ref={ref} data-adnode-slot="YOUR_SLOT_ID" />;
}`;

const nextExample = `"use client";
import { useEffect, useRef } from "react";

export default function AdNodeBanner() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://your-adnode-domain.com/api/embed.js?slotId=YOUR_SLOT_ID";
    ref.current?.appendChild(script);

    return () => script.remove();
  }, []);

  return <div ref={ref} data-adnode-slot="YOUR_SLOT_ID" />;
}`;

const apiExample = `GET /api/embed.js?slotId=YOUR_SLOT_ID
GET /api/embed?mode=frame&slotId=YOUR_SLOT_ID
POST /api/measure`;

function CodeBlock({ language, code }: { language: string; code: string }) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200/70 bg-slate-950 shadow-[0_24px_80px_rgba(2,6,23,0.18)] dark:border-white/10">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 text-xs uppercase tracking-[0.22em] text-sky-200/80">
        <span>{language}</span>
        <button
          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-[11px] tracking-[0.16em] text-sky-100 transition hover:bg-white/5"
          onClick={() => void navigator.clipboard.writeText(code)}
          type="button"
        >
          <Copy className="h-3.5 w-3.5" />
          Copy
        </button>
      </div>
      <pre className="overflow-x-auto p-5 text-sm leading-7 text-sky-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function Docs() {
  const [activeExample, setActiveExample] = useState<"html" | "react" | "next">("html");

  const currentExample =
    activeExample === "html" ? htmlExample : activeExample === "react" ? reactExample : nextExample;
  const currentLanguage = activeExample === "html" ? "html" : activeExample === "react" ? "tsx" : "tsx";

  return (
    <section className="page-shell py-12 sm:py-16">
      <SectionBadge>Documentation</SectionBadge>

      <div className="mt-5 max-w-4xl">
        <h1 className="font-display text-4xl font-semibold sm:text-5xl">Developer integration docs for hosted AdNode.</h1>
        <p className="mt-4 text-base text-muted-foreground sm:text-lg">
          These docs are for developers using your hosted AdNode product. They should be able to open AdNode, choose a live campaign,
          copy a snippet, paste it into their site or app, and start rendering ads without thinking about contracts, env files, or deployment setup.
        </p>
      </div>

      <div className="mt-10 grid gap-8 xl:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="xl:sticky xl:top-24 xl:self-start">
          <div className="rounded-[30px] border border-slate-200/70 bg-white/75 p-5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/50">
            <p className="text-xs uppercase tracking-[0.22em] text-sky-700 dark:text-sky-300">On this page</p>
            <nav className="mt-4 flex flex-col gap-2">
              {docLinks.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="rounded-2xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-sky-50 hover:text-foreground dark:hover:bg-white/5"
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <div className="space-y-8">
          <section id="overview" className="rounded-[34px] border border-slate-200/70 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.9))] p-7 shadow-[0_28px_80px_rgba(14,165,233,0.12)] dark:border-white/10 dark:bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_32%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.94))]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm uppercase tracking-[0.22em] text-sky-700 dark:text-sky-300">Quickstart</p>
                <h2 className="mt-3 font-display text-3xl font-semibold">How a developer integrates an ad from AdNode</h2>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  AdNode gives developers one clean flow: connect wallet, open the developer workspace, browse campaigns, choose one, copy a snippet,
                  and paste it into the page where the ad should appear.
                </p>
              </div>
              <div className="min-w-[260px] rounded-[26px] border border-white/50 bg-white/70 p-5 dark:border-white/10 dark:bg-white/5">
                <p className="text-sm font-medium text-foreground">What the developer actually does</p>
                <div className="mt-4 space-y-3">
                  {hostedCommands.map((item, index) => (
                    <div key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-xs font-semibold text-white">
                        {index + 1}
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section id="developer-flow" className="rounded-[32px] border border-slate-200/70 bg-white/80 p-7 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/55">
            <h2 className="font-display text-3xl font-semibold">Developer flow</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "Step 1",
                  body: "Connect your wallet, enter the Developer workspace, and open Marketplace.",
                  icon: Wallet2,
                },
                {
                  title: "Step 2",
                  body: "Pick a live campaign. Review the creative, pricing model, and rate.",
                  icon: MousePointerClick,
                },
                {
                  title: "Step 3",
                  body: "Copy the snippet and place it into the exact part of your page where the ad should render.",
                  icon: LayoutTemplate,
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="rounded-[26px] bg-slate-50 p-5 dark:bg-white/5">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-300">
                      <Icon className="h-5 w-5" />
                    </span>
                    <p className="mt-4 font-medium">{item.title}</p>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.body}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section id="pick-campaign" className="rounded-[32px] border border-slate-200/70 bg-white/80 p-7 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/55">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-300">
                <BookOpenText className="h-5 w-5" />
              </span>
              <h2 className="font-display text-3xl font-semibold">Step 1. Connect and pick a campaign</h2>
            </div>
            <div className="mt-5 space-y-4 text-sm leading-7 text-muted-foreground">
              <p>
                Go to AdNode, connect your wallet, enter the Developer workspace, open the Marketplace tab, and browse live campaigns.
                Each campaign should clearly show the creative, pricing model such as <span className="font-medium text-foreground">CPC</span> or
                <span className="font-medium text-foreground"> CPM</span>, plus the current payout rate.
              </p>
              <p>
                Once the developer chooses a campaign, they attach it to one of their registered slots. That slot becomes the stable integration point for their site or app.
              </p>
            </div>
            <div className="mt-6 rounded-[28px] bg-slate-950 p-5 text-sm text-sky-100">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-sky-200/80">
                <ArrowRight className="h-3.5 w-3.5" />
                Hosted product flow
              </div>
              <pre className="mt-3 overflow-x-auto leading-7">
                <code>{`Developer workspace -> Marketplace -> Pick campaign -> Assign to slot -> Copy snippet`}</code>
              </pre>
            </div>
          </section>

          <section id="grab-snippet" className="rounded-[32px] border border-slate-200/70 bg-white/80 p-7 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/55">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-300">
                <Code2 className="h-5 w-5" />
              </span>
              <h2 className="font-display text-3xl font-semibold">Step 2. Grab your snippet</h2>
            </div>
            <p className="mt-5 text-sm leading-7 text-muted-foreground">
              After a developer picks a campaign and assigns it to a slot, AdNode gives them a ready-to-paste snippet. They choose the version that matches their stack.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {(["html", "react", "next"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition ${
                    activeExample === option
                      ? "bg-sky-500 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                  }`}
                  onClick={() => setActiveExample(option)}
                >
                  {option === "next" ? "Next.js" : option}
                </button>
              ))}
            </div>

            <div className="mt-5">
              <CodeBlock language={currentLanguage} code={currentExample} />
            </div>

            <p className="mt-5 text-sm leading-7 text-muted-foreground">
              The important idea is that the developer does not manually hardcode campaign data. They place a slot snippet, and AdNode resolves the currently assigned campaign for that slot.
            </p>
          </section>

          <section id="place-ad" className="rounded-[32px] border border-slate-200/70 bg-white/80 p-7 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/55">
            <h2 className="font-display text-3xl font-semibold">Step 3. Place it on your page</h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-muted-foreground">
              <p>
                The developer drops the component or script exactly where the ad should render: header, sidebar, between article blocks, inside a dashboard card, or near the footer.
              </p>
              <p>
                Once the page loads, the ad fetches from the hosted AdNode endpoint and renders the assigned creative automatically. The developer does not need to host the asset themselves.
              </p>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] bg-slate-50 p-5 dark:bg-white/5">
                <p className="font-medium">Good placements</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">Blog sidebars, post breaks, community dashboards, app homepages, docs portals, and lightweight content feeds.</p>
              </div>
              <div className="rounded-[24px] bg-slate-50 p-5 dark:bg-white/5">
                <p className="font-medium">What to avoid</p>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">Hidden containers, collapsed accordions, off-screen placements, and layouts where the iframe width is forced to zero.</p>
              </div>
            </div>
          </section>

          <section id="api-shape" className="rounded-[32px] border border-slate-200/70 bg-white/80 p-7 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/55">
            <h2 className="font-display text-3xl font-semibold">Hosted API shape</h2>
            <p className="mt-5 text-sm leading-7 text-muted-foreground">
              If you host AdNode for your users, these are the endpoints their snippets rely on. This is product documentation, so think of these as the public integration surface.
            </p>
            <div className="mt-5">
              <CodeBlock language="http" code={apiExample} />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div className="rounded-[24px] bg-slate-50 p-5 dark:bg-white/5">
                <p className="font-medium">`/api/embed.js`</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">Returns the script a developer places on their page.</p>
              </div>
              <div className="rounded-[24px] bg-slate-50 p-5 dark:bg-white/5">
                <p className="font-medium">`/api/embed`</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">Returns the iframe experience for the assigned campaign creative.</p>
              </div>
              <div className="rounded-[24px] bg-slate-50 p-5 dark:bg-white/5">
                <p className="font-medium">`/api/measure`</p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">Records impressions and clicks from the hosted embed runtime.</p>
              </div>
            </div>
          </section>

          <section id="best-practices" className="rounded-[32px] border border-slate-200/70 bg-white/80 p-7 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/55">
            <h2 className="font-display text-3xl font-semibold">Best practices for developers</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {[
                "Use one slot per placement so performance and earnings stay easy to track.",
                "Keep the slot mounted long enough for the iframe to load and measure correctly.",
                "Prefer responsive containers that can comfortably show a banner or media creative.",
                "If your app uses client-side routing, keep the slot component in the visible page region after navigation.",
                "Do not rewrite the snippet unless you need a framework-specific wrapper.",
                "If you switch campaigns later, the developer should not need to change code again when the slot stays the same.",
              ].map((item) => (
                <div key={item} className="rounded-[24px] bg-slate-50 p-5 text-sm leading-7 text-muted-foreground dark:bg-white/5">
                  {item}
                </div>
              ))}
            </div>
          </section>

          <SnippetGenerator />
        </div>
      </div>
    </section>
  );
}
