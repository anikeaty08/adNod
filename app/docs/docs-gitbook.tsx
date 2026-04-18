"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/layout/nav";
import { GradientMesh } from "@/components/ui/gradient-mesh";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Block =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "code"; title?: string; code: string };

const sections: { id: string; title: string; blocks: Block[] }[] = [
  {
    id: "intro",
    title: "Introduction",
    blocks: [
      {
        type: "p",
        text: "AdNode connects advertisers (hosters) and publishers (developers) on an EVM chain with Fhenix CoFHE. As a developer, you register inventory slots, assign campaigns that match your category, embed a hosted frame, and withdraw earnings when on-chain rules allow.",
      },
      {
        type: "ul",
        items: [
          "Studio — create campaigns, sync metadata, track listings.",
          "Publisher — register slots, assign campaigns, copy embed snippets.",
          "Account — charts, claimable balance, withdraw when aligned to the payout wrapper step.",
          "This page is a single-scroll handbook with copy-paste examples; use Prev / Next at the bottom to move between chapters.",
        ],
      },
    ],
  },
  {
    id: "developer-quickstart",
    title: "Developer quickstart",
    blocks: [
      {
        type: "p",
        text: "You need a wallet on the same network as the deployed AdRegistry (see env / README). Point the UI at your API with NEXT_PUBLIC_API_URL (or VITE_API_URL) so /api/campaigns and /api/slots resolve from the browser.",
      },
      {
        type: "ul",
        items: [
          "Run the AdNode API locally or deploy it; CORS allows your frontend origin.",
          "Use the Publisher page for guided txs, or reproduce the same calls from your own scripts (below).",
          "Category strings are case-sensitive on-chain semantics — match campaigns exactly.",
        ],
      },
      {
        type: "code",
        title: "Read public metadata (no signature)",
        code: `// Browser or Node — same origin as NEXT_PUBLIC_API_URL
const base = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000";

const campaigns = await fetch(base + "/api/campaigns").then((r) => r.json());
const slots = await fetch(base + "/api/slots").then((r) => r.json());

console.log(campaigns, slots);`,
      },
    ],
  },
  {
    id: "onchain-publisher",
    title: "On-chain: register & assign",
    blocks: [
      {
        type: "p",
        text: "Publishers call AdRegistry: registerSlot(siteName, category) then assignCampaignToSlot(slotId, campaignId). The UI uses wagmi/viem; here is the same shape you would use in a script with viem’s walletClient.writeContract.",
      },
      {
        type: "code",
        title: "registerSlot (conceptual viem call)",
        code: `import { parseAbi } from "viem";

const registryAbi = parseAbi([
  "function registerSlot(string siteName, string category) external",
  "function assignCampaignToSlot(uint256 slotId, uint256 campaignId) external",
]);

await walletClient.writeContract({
  address: registryAddress,
  abi: registryAbi,
  functionName: "registerSlot",
  args: ["My blog", "news"],
});`,
      },
      {
        type: "code",
        title: "assignCampaignToSlot",
        code: `await walletClient.writeContract({
  address: registryAddress,
  abi: registryAbi,
  functionName: "assignCampaignToSlot",
  args: [123n, 45n], // your slot id, on-chain campaign id
});`,
      },
      {
        type: "p",
        text: "After assignment, impressions/clicks are attributed through the protocol stack; your wallet accrues claimable native on the registry. Sync slot metadata to the API with a signed POST so dashboards and embeds stay in sync.",
      },
    ],
  },
  {
    id: "embedding",
    title: "Embed on your site",
    blocks: [
      {
        type: "p",
        text: "The hosted iframe loads from your AdNode deployment’s origin. Replace YOUR_ORIGIN with that origin (e.g. https://app.example.com) and SLOT_ID with your on-chain slot id. The Publisher panel generates these snippets for you — this section mirrors that output.",
      },
      {
        type: "code",
        title: "Minimal HTML iframe",
        code: `<iframe
  src="YOUR_ORIGIN/api/embed?mode=frame&slotId=SLOT_ID"
  title="AdNode slot"
  loading="lazy"
  style="width:100%;min-height:280px;border:0;border-radius:20px"
/>`,
      },
      {
        type: "code",
        title: "Self-contained script (mounts before the script tag)",
        code: `(function(){
  var identifier = "SLOT_ID";
  var origin = "YOUR_ORIGIN";
  var selector = '[data-adnode-slot="' + identifier + '"]';
  var mount = document.querySelector(selector);
  if (!mount) {
    mount = document.createElement("div");
    mount.setAttribute("data-adnode-slot", identifier);
    document.currentScript && document.currentScript.parentNode
      && document.currentScript.parentNode.insertBefore(mount, document.currentScript);
  }
  mount.innerHTML = "";
  var frame = document.createElement("iframe");
  frame.src = origin + "/api/embed?mode=frame&slotId=" + encodeURIComponent(identifier);
  frame.loading = "lazy";
  frame.style.width = "100%";
  frame.style.minHeight = "280px";
  frame.style.border = "0";
  frame.style.borderRadius = "20px";
  mount.appendChild(frame);
})();`,
      },
      {
        type: "p",
        text: "For React or Next.js App Router, use a small client component that creates the iframe in useEffect (see lib/embed.ts buildEmbedReact / buildEmbedNext in the repo). Mark the file with \"use client\" when you import it into server layouts.",
      },
    ],
  },
  {
    id: "api-sync",
    title: "API: signed sync",
    blocks: [
      {
        type: "p",
        text: "Write routes expect headers built from an EIP-191 personal_sign over an exact multiline message. The server rebuilds the message from the same JSON body you POST and verifies with viem verifyMessage (see server/request-auth.ts).",
      },
      {
        type: "code",
        title: "Canonical message format",
        code: `AdNode API Authorization
Action: slots:create
Address: 0xabc...def
Timestamp: 1710000000000
Payload: {"chainSlotId":"12","siteName":"Blog","category":"news"}`,
      },
      {
        type: "code",
        title: "Headers (lowercase keys over the wire)",
        code: `{
  "Content-Type": "application/json",
  "x-adnode-action": "slots:create",
  "x-adnode-address": "0x...",
  "x-adnode-timestamp": "1710000000000",
  "x-adnode-signature": "0x..."
}`,
      },
      {
        type: "code",
        title: "fetch example (after you sign message with the wallet)",
        code: `const action = "slots:create";
const payload = {
  chainSlotId: "12",
  siteName: "My site",
  category: "news",
  siteUrl: "https://example.com",
  trafficEstimate: "10000",
};

const ts = String(Date.now());
const message = [
  "AdNode API Authorization",
  "Action: " + action,
  "Address: " + address.toLowerCase(),
  "Timestamp: " + ts,
  "Payload: " + JSON.stringify(payload),
].join(String.fromCharCode(10));

const signature = await wallet.signMessage({ message });

await fetch(apiBase + "/api/slots", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-adnode-action": action,
    "x-adnode-address": address,
    "x-adnode-timestamp": ts,
    "x-adnode-signature": signature,
  },
  body: JSON.stringify(payload),
\`});`,
      },
      {
        type: "p",
        text: "Campaign metadata uses action campaigns:create with a payload that includes chainCampaignId, title, description, creativeURI, category, pricingModel, rate, and advertiser. Timestamp must be within a few minutes of server time.",
      },
    ],
  },
  {
    id: "earning",
    title: "How you earn & withdraw",
    blocks: [
      {
        type: "p",
        text: "When your slot serves ads, measurement and settlement follow the registry + analytics contracts. Developer earnings accrue as claimable native on AdRegistry. You call claimMyEarnings from your connected wallet; the transaction forwards through the payout wrapper, which shields in discrete steps (wrapper rate() in wei, often 1e12 wei per step).",
      },
      {
        type: "ul",
        items: [
          "You only successfully withdraw when claimable is at least one full step and is a whole multiple of that step — the Account page shows raw wei, step, remainder, and simulates the claim when possible.",
          "If the UI math looks right but the RPC still errors, try a different RPC endpoint; some gateways surface FHE reverts as generic JSON-RPC errors.",
          "Successful claims can be logged locally for charts (device-only history).",
        ],
      },
      {
        type: "code",
        title: "claimMyEarnings (registry)",
        code: `await walletClient.writeContract({
  address: registryAddress,
  abi: registryAbi,
  functionName: "claimMyEarnings",
});`,
      },
      {
        type: "p",
        text: "There is no separate “invoice API” for earnings — trust the on-chain claimable read plus your transaction history. Use Account charts to sanity-check spend across slots and campaigns you host or publish.",
      },
    ],
  },
  {
    id: "advertisers",
    title: "For advertisers (hosters)",
    blocks: [
      { type: "p", text: "Hosters encrypt budget and CPC scalars in the browser (CoFHE), call createCampaign with matching public settlement terms, then sign campaigns:create so the API and embed layer see human-readable metadata." },
      {
        type: "ul",
        items: [
          "Creative — ipfs:// or https:// URI.",
          "Category — must match publisher slots you want to fill.",
          "Rate string — must match parseEther(rate) used as settlementRateWei on-chain.",
          "Initial fund — optional ETH sent with the create tx.",
        ],
      },
    ],
  },
  {
    id: "help-glossary",
    title: "Help chat & glossary",
    blocks: [
      {
        type: "p",
        text: "The floating help widget calls POST /api/assistant/chat with no wallet signature (rate-limited). Configure Groq on the server for natural-language answers about this flow.",
      },
      {
        type: "ul",
        items: [
          "Hoster — wallet that owns the campaign on-chain.",
          "Developer / publisher — wallet that owns slots and receives claimable earnings.",
          "tFHE — UI label for confidential-side balances; enforcement still uses public wei rules for rates and steps.",
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
        <code className="font-mono whitespace-pre">{code}</code>
      </pre>
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
              className={`shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs ${active === i ? "border-accent bg-accent/15 text-[var(--text)]" : "border-border text-muted"}`}
              onClick={() => scrollTo(i)}
            >
              {s.title}
            </button>
          ))}
        </div>
        <aside className="hidden w-56 shrink-0 md:block">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Contents</p>
          <nav className="sticky top-24 mt-4 space-y-1 border-l border-border pl-3">
            {sections.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollTo(i)}
                className={`block w-full cursor-pointer rounded-r-md py-1.5 pl-2 text-left text-sm transition-colors ${
                  active === i ? "border-l-2 border-accent bg-accent/10 font-medium text-[var(--text)]" : "text-muted hover:text-[var(--text)]"
                }`}
                style={{ marginLeft: active === i ? "-3px" : 0 }}
              >
                {s.title}
              </button>
            ))}
          </nav>
          <Link href="/app/publisher" className="mt-8 inline-block text-sm text-accent hover:underline">
            Open Publisher →
          </Link>
          <Link href="/app/studio/create" className="mt-2 block cursor-pointer text-sm text-accent hover:underline">
            Open Studio →
          </Link>
        </aside>

        <article ref={articleRef} className="min-w-0 max-w-3xl flex-1">
          <h1 className="font-display text-3xl font-bold tracking-tight text-[var(--text)]">Documentation</h1>
          <p className="mt-2 text-sm text-muted">
            Developer-oriented guide: contracts, embeds, signed API sync, and how earnings reach your wallet. Use the chapter list or Prev / Next.
          </p>

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
                    ) : (
                      <CodeBlock key={`${s.id}-code-${j}`} title={b.title} code={b.code} />
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
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-40 hover:bg-accent/10"
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
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-40 hover:bg-accent/10"
          >
            Next <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </>
  );
}
