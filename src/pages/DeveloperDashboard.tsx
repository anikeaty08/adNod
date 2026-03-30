import { CampaignCard } from "@/components/dashboard/CampaignCard";
import { SnippetGenerator } from "@/components/docs/SnippetGenerator";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatsCard } from "@/components/shared/StatsCard";
import { useCampaignMetrics, useCampaigns } from "@/hooks/useCampaigns";
import { Button } from "@/components/shared/Button";
import { useAdNode } from "@/hooks/useAdNode";
import { useWallet } from "@/context/WalletContext";
import { useState } from "react";

export function DeveloperDashboard() {
  const { data: campaigns = [] } = useCampaigns();
  const metrics = useCampaignMetrics(campaigns);
  const { registerSlot, getMyEarnings, isConfigured } = useAdNode();
  const { connected } = useWallet();
  const [siteName, setSiteName] = useState("");
  const [category, setCategory] = useState("");
  const [earnings, setEarnings] = useState<string | null>(null);
  const [status, setStatus] = useState("Register your ad slot on-chain and decrypt earnings when they accrue.");
  const developerMetrics = [
    {
      label: "Open campaigns",
      value: String(metrics.activeCount),
      hint: campaigns.length ? "Available for publisher integration" : "No open demand yet",
    },
    {
      label: "Categories live",
      value: String(new Set(campaigns.map((campaign) => campaign.category)).size),
      hint: campaigns.length ? "Public campaign tags from AdRegistry" : "No on-chain categories yet",
    },
    {
      label: "Earnings visibility",
      value: earnings ?? "Encrypted",
      hint: connected ? "Click decrypt to reveal your payout balance." : "Connect your wallet to decrypt earnings.",
    },
    {
      label: "Slot registration",
      value: connected ? "On-chain ready" : "Wallet required",
      hint: isConfigured ? "Register publisher inventory directly in AdRegistry." : "Configure Fhenix env before publishing slots.",
    },
  ];

  const handleRegisterSlot = async () => {
    if (!connected) {
      setStatus("Connect your wallet before registering a developer slot.");
      return;
    }

    if (!siteName || !category) {
      setStatus("Add a site name and category to register a slot.");
      return;
    }

    setStatus("Registering slot on-chain...");
    try {
      const hash = await registerSlot(siteName, category);
      setStatus(`Slot registered. Tx: ${hash}`);
      setSiteName("");
      setCategory("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Slot registration failed.");
    }
  };

  const handleDecryptEarnings = async () => {
    if (!connected) {
      setStatus("Connect your wallet before decrypting earnings.");
      return;
    }

    setStatus("Decrypting your publisher earnings...");
    try {
      const value = await getMyEarnings();
      setEarnings(value);
      setStatus("Encrypted earnings decrypted with your wallet permit.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to decrypt earnings.");
    }
  };

  return (
    <section className="page-shell py-12 sm:py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">Developer dashboard</p>
          <h1 className="mt-3 font-display text-4xl font-semibold">Monetize placements with verifiable payouts.</h1>
        </div>
        <p className="max-w-xl text-sm text-muted-foreground">
          Browse live campaigns, copy framework-safe snippets, and monitor earnings without leaving your dApp workflow.
        </p>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {developerMetrics.map((metric) => (
          <StatsCard key={metric.label} {...metric} />
        ))}
      </div>
      <div className="mt-8 grid gap-8 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="glass-panel rounded-[32px] p-7">
          <h3 className="font-display text-2xl font-semibold">Publisher slot and earnings</h3>
          <div className="mt-6 space-y-4">
            <label className="block space-y-2 text-sm">
              <span>Site name</span>
              <input
                className="w-full rounded-2xl border bg-white/80 px-4 py-3 dark:bg-slate-950/50"
                value={siteName}
                onChange={(event) => setSiteName(event.target.value)}
                placeholder="Your site or app name"
              />
            </label>
            <label className="block space-y-2 text-sm">
              <span>Category</span>
              <input
                className="w-full rounded-2xl border bg-white/80 px-4 py-3 dark:bg-slate-950/50"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Developer tooling, gaming, DeFi..."
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] bg-white/70 p-4 dark:bg-white/5">
                <p className="text-sm text-muted-foreground">Encrypted earnings</p>
                <p className="mt-2 font-display text-2xl font-semibold">{earnings ?? "Locked"}</p>
              </div>
              <div className="rounded-[24px] bg-white/70 p-4 dark:bg-white/5">
                <p className="text-sm text-muted-foreground">Slot state</p>
                <p className="mt-2 font-medium">{connected ? "Ready to register" : "Connect wallet"}</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" onClick={() => void handleRegisterSlot()} disabled={!isConfigured}>
                Register slot on-chain
              </Button>
              <Button type="button" variant="secondary" onClick={() => void handleDecryptEarnings()} disabled={!isConfigured}>
                Decrypt earnings
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{status}</p>
          </div>
        </div>
        <SnippetGenerator />
      </div>
      {!isConfigured ? (
        <div className="mt-6 rounded-[28px] border border-amber-300/60 bg-amber-50/80 px-5 py-4 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100">
          Fhenix RPC or contract addresses are missing. Slot registration and encrypted earnings stay disabled until the Web3 environment is configured.
        </div>
      ) : null}
      <div className="mt-8 grid gap-5">
        {campaigns.length ? (
          campaigns.map((campaign) => <CampaignCard key={campaign.id} campaign={campaign} />)
        ) : (
          <EmptyState
            title="No developer listings yet"
            description="Once hosters create campaigns, available opportunities will show here for publishers to review and integrate."
          />
        )}
      </div>
    </section>
  );
}
