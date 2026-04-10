import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CampaignCard } from "@/components/dashboard/CampaignCard";
import { SnippetGenerator } from "@/components/docs/SnippetGenerator";
import { Button } from "@/components/shared/Button";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatsCard } from "@/components/shared/StatsCard";
import { useWallet } from "@/context/WalletContext";
import { useCampaignMetrics, useCampaigns, useSlotMetrics, useSlots } from "@/hooks/useCampaigns";
import { useAdNode } from "@/hooks/useAdNode";

export function DeveloperDashboard() {
  const { data: campaigns = [] } = useCampaigns();
  const { data: slots = [] } = useSlots();
  const metrics = useCampaignMetrics(campaigns);
  const {
    registerSlot,
    getMyEarnings,
    getMyClaimableEarnings,
    claimMyEarnings,
    getMyShieldedPayoutBalance,
    beginUnshieldPayout,
    getMyUnshieldClaims,
    completeUnshieldClaim,
    isConfigured,
    saveSlotMetadata,
    assignCampaignToSlot,
  } = useAdNode();
  const { connected, address } = useWallet();

  const [siteName, setSiteName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [category, setCategory] = useState("");
  const [dailyTrafficEstimate, setDailyTrafficEstimate] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [earnings, setEarnings] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("Register your slot, serve embeds, and move settled payouts through the confidential wrapper when ready.");
  const [isDecryptingEarnings, setIsDecryptingEarnings] = useState(false);
  const [claimableEarnings, setClaimableEarnings] = useState<string | null>(null);
  const [shieldedPayoutBalance, setShieldedPayoutBalance] = useState<string | null>(null);
  const [unshieldAmount, setUnshieldAmount] = useState("");
  const [unshieldClaims, setUnshieldClaims] = useState<
    Array<{
      to: string;
      ctHash: `0x${string}`;
      requestedAmountFormatted: string;
      decryptedAmountFormatted: string;
      claimed: boolean;
    }>
  >([]);
  const [isClaimingEarnings, setIsClaimingEarnings] = useState(false);
  const [isUnshielding, setIsUnshielding] = useState(false);
  const [claimingCtHash, setClaimingCtHash] = useState<string | null>(null);
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
  useSlotMetrics(ownedSlots);
  const earningsChartData = earnings && address ? [{ name: address, earnings: Number(earnings) }] : [];

  useEffect(() => {
    let active = true;

    if (!connected || !isConfigured) {
      setClaimableEarnings(null);
      setShieldedPayoutBalance(null);
      setUnshieldClaims([]);
      return () => {
        active = false;
      };
    }

    void Promise.allSettled([getMyClaimableEarnings(), getMyShieldedPayoutBalance(), getMyUnshieldClaims()]).then((results) => {
      if (!active) return;

      const [claimable, shielded, claims] = results;
      setClaimableEarnings(claimable.status === "fulfilled" ? claimable.value : null);
      setShieldedPayoutBalance(shielded.status === "fulfilled" ? shielded.value : null);
      setUnshieldClaims(claims.status === "fulfilled" ? claims.value.filter((claim) => !claim.claimed) : []);
    });

    return () => {
      active = false;
    };
  }, [connected, getMyClaimableEarnings, getMyShieldedPayoutBalance, getMyUnshieldClaims, isConfigured]);

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
      hint: connected ? "Decrypt with your wallet permit to reveal lifetime earnings." : "Connect your wallet to decrypt earnings.",
    },
    {
      label: "Claimable payout",
      value: claimableEarnings ? `${claimableEarnings} ETH` : connected ? "0 ETH" : "Wallet required",
      hint: "Settlement moves funded escrow into this claimable balance.",
    },
    {
      label: "Shielded balance",
      value: shieldedPayoutBalance ? `${shieldedPayoutBalance} anETH` : connected ? "Encrypted" : "Wallet required",
      hint: "Claiming moves payout into the confidential wrapper before unshielding back to ETH.",
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
      const [value, claimable, shielded] = await Promise.all([getMyEarnings(), getMyClaimableEarnings(), getMyShieldedPayoutBalance()]);
      setEarnings(value);
      setClaimableEarnings(claimable);
      setShieldedPayoutBalance(shielded);
      setStatus("Encrypted earnings decrypted with your wallet permit.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Decrypt failed - check you are using the correct developer wallet");
    } finally {
      setIsDecryptingEarnings(false);
    }
  };

  const handleClaimEarnings = async () => {
    if (!connected) {
      setStatus("Connect your wallet before claiming earnings.");
      return;
    }

    setIsClaimingEarnings(true);
    setStatus("Moving claimable payout into the confidential wrapper...");
    try {
      const hash = await claimMyEarnings();
      const [claimable, shielded, claims] = await Promise.all([getMyClaimableEarnings(), getMyShieldedPayoutBalance(), getMyUnshieldClaims()]);
      setClaimableEarnings(claimable);
      setShieldedPayoutBalance(shielded);
      setUnshieldClaims(claims.filter((claim) => !claim.claimed));
      setStatus(`Claimable payout moved into your shielded wrapper balance. Tx: ${hash}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Payout claim failed.");
    } finally {
      setIsClaimingEarnings(false);
    }
  };

  const handleUnshieldPayout = async () => {
    if (!connected) {
      setStatus("Connect your wallet before unshielding payout tokens.");
      return;
    }

    if (!unshieldAmount.trim()) {
      setStatus("Enter an amount to unshield.");
      return;
    }

    setIsUnshielding(true);
    setStatus("Submitting unshield request to the wrapper...");
    try {
      const hash = await beginUnshieldPayout(unshieldAmount);
      const [shielded, claims] = await Promise.all([getMyShieldedPayoutBalance(), getMyUnshieldClaims()]);
      setShieldedPayoutBalance(shielded);
      setUnshieldClaims(claims.filter((claim) => !claim.claimed));
      setUnshieldAmount("");
      setStatus(`Unshield request created. Finish the threshold claim below to release ETH. Tx: ${hash}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unshield request failed.");
    } finally {
      setIsUnshielding(false);
    }
  };

  const handleCompleteClaim = async (ctHash: `0x${string}`) => {
    setClaimingCtHash(ctHash);
    setStatus("Decrypting the wrapper claim and finalizing native ETH release...");
    try {
      const hash = await completeUnshieldClaim(ctHash);
      const [shielded, claims] = await Promise.all([getMyShieldedPayoutBalance(), getMyUnshieldClaims()]);
      setShieldedPayoutBalance(shielded);
      setUnshieldClaims(claims.filter((claim) => !claim.claimed));
      setStatus(`Unshield claim completed. Native ETH released from the wrapper. Tx: ${hash}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unshield claim failed.");
    } finally {
      setClaimingCtHash(null);
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
          <h1 className="mt-3 font-display text-4xl font-semibold">Serve embeds and settle privately.</h1>
        </div>
        <p className="max-w-xl text-sm text-muted-foreground">
          Register your slot, assign funded campaigns, serve the embed runtime, then move settled payouts through the confidential wrapper when you want native ETH out.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {developerMetrics.map((metric) => (
          <StatsCard key={metric.label} {...metric} />
        ))}
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="glass-panel rounded-[32px] p-7">
          <h3 className="font-display text-2xl font-semibold">Publisher slot and payout flow</h3>
          <div className="mt-6 space-y-4">
            <label className="block space-y-2 text-sm">
              <span>Site name</span>
              <input className="w-full rounded-2xl border bg-white/80 px-4 py-3 dark:bg-slate-950/50" value={siteName} onChange={(event) => setSiteName(event.target.value)} placeholder="Your site or app name" />
            </label>
            <label className="block space-y-2 text-sm">
              <span>Category</span>
              <input className="w-full rounded-2xl border bg-white/80 px-4 py-3 dark:bg-slate-950/50" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Developer tooling, gaming, DeFi..." />
            </label>
            <label className="block space-y-2 text-sm">
              <span>Site URL</span>
              <input className="w-full rounded-2xl border bg-white/80 px-4 py-3 dark:bg-slate-950/50" value={siteUrl} onChange={(event) => setSiteUrl(event.target.value)} placeholder="https://your-site.com" />
            </label>
            <label className="block space-y-2 text-sm">
              <span>Daily traffic estimate</span>
              <input className="w-full rounded-2xl border bg-white/80 px-4 py-3 dark:bg-slate-950/50" value={dailyTrafficEstimate} onChange={(event) => setDailyTrafficEstimate(event.target.value)} placeholder="5000" />
            </label>
            <label className="block space-y-2 text-sm">
              <span>Assign into slot</span>
              <select className="w-full rounded-2xl border bg-white/80 px-4 py-3 dark:bg-slate-950/50" value={selectedSlotId} onChange={(event) => setSelectedSlotId(event.target.value)}>
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
                <p className="text-sm text-muted-foreground">Encrypted lifetime earnings</p>
                <p className="mt-2 font-display text-2xl font-semibold">{earnings ? `${earnings} ETH` : "Encrypted"}</p>
              </div>
              <div className="rounded-[24px] bg-white/70 p-4 dark:bg-white/5">
                <p className="text-sm text-muted-foreground">Claimable payout</p>
                <p className="mt-2 font-medium">{claimableEarnings ? `${claimableEarnings} ETH` : connected ? "0 ETH" : "Connect wallet"}</p>
              </div>
              <div className="rounded-[24px] bg-white/70 p-4 dark:bg-white/5 md:col-span-2">
                <p className="text-sm text-muted-foreground">Shielded wrapper balance</p>
                <p className="mt-2 font-medium">{shieldedPayoutBalance ? `${shieldedPayoutBalance} anETH` : connected ? "Decrypt to view" : "Connect wallet"}</p>
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
              <p className="mt-4 text-xs text-muted-foreground">Settlement books impressions and clicks on-chain, claimable escrow moves into the wrapper, and unshield claims move it back to native ETH.</p>
            </div>

            <div className="rounded-[24px] bg-white/70 p-4 dark:bg-white/5">
              <p className="text-sm font-medium">Unshield wrapper payout</p>
              <p className="mt-1 text-sm text-muted-foreground">Start an unshield request, then finish the threshold decryption claim to receive native ETH.</p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input className="w-full rounded-2xl border bg-white/80 px-4 py-3 dark:bg-slate-950/50" placeholder="0.100000" value={unshieldAmount} onChange={(event) => setUnshieldAmount(event.target.value)} />
                <Button type="button" variant="secondary" onClick={() => void handleUnshieldPayout()} disabled={!isConfigured || isUnshielding}>
                  {isUnshielding ? "Unshielding..." : "Start unshield"}
                </Button>
              </div>
            </div>

            {unshieldClaims.length ? (
              <div className="rounded-[24px] bg-white/70 p-4 dark:bg-white/5">
                <p className="text-sm font-medium">Pending unshield claims</p>
                <div className="mt-4 space-y-3">
                  {unshieldClaims.map((claim) => (
                    <div key={claim.ctHash} className="rounded-2xl border border-sky-200/70 px-4 py-4 dark:border-sky-500/20">
                      <p className="text-sm font-medium">{claim.requestedAmountFormatted} anETH requested</p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{claim.ctHash}</p>
                      <Button className="mt-3" type="button" onClick={() => void handleCompleteClaim(claim.ctHash)} disabled={claimingCtHash === claim.ctHash}>
                        {claimingCtHash === claim.ctHash ? "Claiming..." : "Decrypt and claim ETH"}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" onClick={() => void handleRegisterSlot()} disabled={!isConfigured}>
                Register slot on-chain
              </Button>
              <Button type="button" variant="secondary" onClick={() => void handleDecryptEarnings()} disabled={!isConfigured || isDecryptingEarnings}>
                {isDecryptingEarnings ? "Decrypting earnings..." : "Decrypt earnings"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => void handleClaimEarnings()} disabled={!isConfigured || isClaimingEarnings || !claimableEarnings || Number(claimableEarnings) <= 0}>
                {isClaimingEarnings ? "Claiming..." : "Claim to wrapper"}
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
            <input className="w-full rounded-2xl border bg-white/80 px-4 py-3 dark:bg-slate-950/50" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search campaign title" />
          </label>
          <label className="space-y-2 text-sm">
            <span>Filter by category</span>
            <select className="w-full rounded-2xl border bg-white/80 px-4 py-3 dark:bg-slate-950/50" value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)}>
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
