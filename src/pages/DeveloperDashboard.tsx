import { CampaignCard } from "@/components/dashboard/CampaignCard";
import { SnippetGenerator } from "@/components/docs/SnippetGenerator";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatsCard } from "@/components/shared/StatsCard";
import { useCampaignMetrics, useCampaigns, useSlotMetrics, useSlots } from "@/hooks/useCampaigns";
import { Button } from "@/components/shared/Button";
import { useAdNode } from "@/hooks/useAdNode";
import { useWallet } from "@/context/WalletContext";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function DeveloperDashboard() {
  const { data: campaigns = [] } = useCampaigns();
  const { data: slots = [] } = useSlots();
  const metrics = useCampaignMetrics(campaigns);
  const { registerSlot, getMyEarnings, isConfigured, saveSlotMetadata, assignCampaignToSlot } = useAdNode();
  const { connected, address } = useWallet();
  const [siteName, setSiteName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [category, setCategory] = useState("");
  const [dailyTrafficEstimate, setDailyTrafficEstimate] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [earnings, setEarnings] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Register your ad slot on-chain and decrypt earnings when they accrue.");
  const [isDecryptingEarnings, setIsDecryptingEarnings] = useState(false);
  const [isAssigningCampaignId, setIsAssigningCampaignId] = useState<string | null>(null);
  const categories = useMemo(() => Array.from(new Set(campaigns.map((campaign) => campaign.category))).sort(), [campaigns]);
  const filteredCampaigns = useMemo(
    () =>
      campaigns.filter(
        (campaign) =>
          campaign.status === "active" &&
          (filterCategory === "all" || campaign.category === filterCategory) &&
          campaign.title.toLowerCase().includes(search.toLowerCase()),
      ),
    [campaigns, filterCategory, search],
  );
  const ownedSlots = address ? slots.filter((slot) => slot.developer.toLowerCase() === address.toLowerCase()) : [];
  const slotMetrics = useSlotMetrics(ownedSlots);
  const earningsChartData = earnings && address ? [{ name: address, earnings: Number(earnings) }] : [];
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
      label: "Registered slots",
      value: String(ownedSlots.length),
      hint: ownedSlots.length ? "Your on-chain publisher inventory" : "Register your first slot",
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

    if (!siteName || !siteUrl || !category || !dailyTrafficEstimate) {
      setStatus("Add site name, site URL, category, and traffic estimate to register a slot.");
      return;
    }

    setStatus("Registering slot on-chain...");
    try {
      const result = await registerSlot(siteName, category);
      try {
        await saveSlotMetadata({
          chainSlotId: String(result.slotId),
          siteName,
          siteUrl,
          category,
          dailyTrafficEstimate,
        });
        setStatus(`Slot ${result.slotId} registered. Tx: ${result.hash}`);
      } catch {
        setStatus(`Slot ${result.slotId} is live on-chain, but metadata sync failed. Retry slot details sync from this browser.`);
      }
      setSiteName("");
      setSiteUrl("");
      setCategory("");
      setDailyTrafficEstimate("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Slot registration failed.");
    }
  };

  const handleDecryptEarnings = async () => {
    if (!connected) {
      setStatus("Connect your wallet before decrypting earnings.");
      return;
    }

    setIsDecryptingEarnings(true);
    setStatus("Requesting wallet permit for encrypted earnings...");
    try {
      const value = await getMyEarnings();
      setEarnings(value);
      setStatus("Encrypted earnings decrypted with your wallet permit.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Decrypt failed — check you are using the correct developer wallet");
    } finally {
      setIsDecryptingEarnings(false);
    }
  };

  const handleAssignCampaign = async (campaignId: string) => {
    if (!selectedSlotId) {
      setStatus("Select one of your slots before assigning a campaign.");
      return;
    }

    setIsAssigningCampaignId(campaignId);
    setStatus("Assigning campaign to slot on-chain...");
    try {
      const hash = await assignCampaignToSlot(Number(selectedSlotId), Number(campaignId));
      setStatus(`Campaign assigned to slot. Tx: ${hash}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Campaign assignment failed.");
    } finally {
      setIsAssigningCampaignId(null);
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
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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
            <label className="block space-y-2 text-sm">
              <span>Site URL</span>
              <input
                className="w-full rounded-2xl border bg-white/80 px-4 py-3 dark:bg-slate-950/50"
                value={siteUrl}
                onChange={(event) => setSiteUrl(event.target.value)}
                placeholder="https://your-site.com"
              />
            </label>
            <label className="block space-y-2 text-sm">
              <span>Daily traffic estimate</span>
              <input
                className="w-full rounded-2xl border bg-white/80 px-4 py-3 dark:bg-slate-950/50"
                value={dailyTrafficEstimate}
                onChange={(event) => setDailyTrafficEstimate(event.target.value)}
                placeholder="5000"
              />
            </label>
            <label className="block space-y-2 text-sm">
              <span>Assign into slot</span>
              <select
                className="w-full rounded-2xl border bg-white/80 px-4 py-3 dark:bg-slate-950/50"
                value={selectedSlotId}
                onChange={(event) => setSelectedSlotId(event.target.value)}
              >
                <option value="">Choose one of your slots</option>
                {ownedSlots.map((slot) => (
                  <option key={slot.chainSlotId} value={slot.chainSlotId}>
                    {slot.siteName} ({slot.chainSlotId})
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] bg-white/70 p-4 dark:bg-white/5">
                <p className="text-sm text-muted-foreground">Encrypted earnings</p>
                <p className="mt-2 font-display text-2xl font-semibold">{earnings ? `${earnings} ETH` : "Encrypted"}</p>
              </div>
              <div className="rounded-[24px] bg-white/70 p-4 dark:bg-white/5">
                <p className="text-sm text-muted-foreground">Slot state</p>
                <p className="mt-2 font-medium">{ownedSlots.length ? `${slotMetrics.assignedCount} assigned` : connected ? "Ready to register" : "Connect wallet"}</p>
              </div>
            </div>
            <div className="rounded-[24px] bg-white/70 p-4 dark:bg-white/5">
              <p className="text-sm text-muted-foreground">Total Earnings</p>
              {earningsChartData.length ? (
                <div className="mt-4 h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={earningsChartData}>
                      <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="earnings" fill="#1E90FF" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="mt-4 rounded-[18px] border border-dashed border-sky-300/70 px-4 py-10 text-center text-sm text-muted-foreground dark:border-sky-500/20">
                  Decrypt earnings to populate the total earnings chart.
                </div>
              )}
              <p className="mt-4 text-xs text-muted-foreground">Per-slot earnings breakdown is a Wave 2 feature. The live contract stores earnings per developer address, not per slot.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" onClick={() => void handleRegisterSlot()} disabled={!isConfigured}>
                Register slot on-chain
              </Button>
              <Button type="button" variant="secondary" onClick={() => void handleDecryptEarnings()} disabled={!isConfigured || isDecryptingEarnings}>
                {isDecryptingEarnings ? "Decrypting earnings..." : "Decrypt earnings"}
              </Button>
              <Button type="button" variant="ghost" disabled>
                Withdrawals live in Wave 2
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
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span>Search by title</span>
            <input
              className="w-full rounded-2xl border bg-white/80 px-4 py-3 dark:bg-slate-950/50"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search campaign title"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span>Filter by category</span>
            <select
              className="w-full rounded-2xl border bg-white/80 px-4 py-3 dark:bg-slate-950/50"
              value={filterCategory}
              onChange={(event) => setFilterCategory(event.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>
        {ownedSlots.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {ownedSlots.map((slot) => (
              <div key={slot.chainSlotId} className="glass-panel rounded-[28px] p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">Slot {slot.chainSlotId}</p>
                <h3 className="mt-3 font-display text-2xl font-semibold">{slot.siteName}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{slot.siteUrl}</p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>Category: {slot.category}</span>
                  <span>Daily traffic: {slot.dailyTrafficEstimate}</span>
                  <span>Assigned campaign: {slot.assignedCampaignId || "None"}</span>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {filteredCampaigns.length ? (
          filteredCampaigns.map((campaign) => (
            <div key={campaign.id} className="space-y-3">
              <CampaignCard campaign={campaign} />
              <div className="flex justify-end">
                <Button type="button" onClick={() => void handleAssignCampaign(campaign.id)} disabled={!selectedSlotId || isAssigningCampaignId === campaign.id}>
                  {isAssigningCampaignId === campaign.id ? "Assigning..." : "Add to my slot"}
                </Button>
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            title="No developer listings yet"
            description={
              campaigns.length
                ? "No campaigns match the selected category yet."
                : "Once hosters create campaigns, available opportunities will show here for publishers to review and integrate."
            }
          />
        )}
      </div>
    </section>
  );
}
