import { useState } from "react";
import type { ContractCampaign } from "@/lib/fhenix-contract";
import { Button } from "@/components/shared/Button";
import { useAdNode } from "@/hooks/useAdNode";

export function PerformancePanel({ campaigns }: { campaigns: ContractCampaign[] }) {
  const { getMyStats, getMyBudget } = useAdNode();
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(campaigns[0] ? Number(campaigns[0].id) : null);
  const [status, setStatus] = useState("Encrypted analytics are hidden until you decrypt them.");
  const [stats, setStats] = useState<{ budget: string; impressions: number; clicks: number } | null>(null);

  const handleDecrypt = async () => {
    if (!selectedCampaignId) return;

    setStatus("Decrypting campaign analytics...");
    try {
      const [budget, decryptedStats] = await Promise.all([getMyBudget(selectedCampaignId), getMyStats(selectedCampaignId)]);
      setStats({
        budget,
        impressions: decryptedStats.impressions,
        clicks: decryptedStats.clicks,
      });
      setStatus("Encrypted analytics decrypted with your wallet permit.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to decrypt analytics.");
    }
  };

  return (
    <div className="glass-panel rounded-[32px] p-7">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl font-semibold">Performance trend</h3>
          <p className="mt-2 text-sm text-muted-foreground">Decrypt campaign budget and analytics from the Fhenix contracts when you need them.</p>
        </div>
        <div className="rounded-full bg-white/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 dark:bg-white/5 dark:text-sky-200">
          Encrypted analytics
        </div>
      </div>
      <div className="mt-8 space-y-4">
        <label className="space-y-2 text-sm">
          <span>Campaign</span>
          <select
            className="w-full rounded-2xl border bg-white/80 px-4 py-3 dark:bg-slate-950/50"
            value={selectedCampaignId ?? ""}
            onChange={(event) => setSelectedCampaignId(Number(event.target.value))}
          >
            {campaigns.length ? (
              campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.title}
                </option>
              ))
            ) : (
              <option value="">No campaigns</option>
            )}
          </select>
        </label>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] bg-white/70 p-5 dark:bg-white/5">
            <p className="text-sm text-muted-foreground">Budget</p>
            <p className="mt-3 font-display text-2xl font-semibold">{stats ? `${stats.budget} ETH` : "Locked"}</p>
          </div>
          <div className="rounded-[24px] bg-white/70 p-5 dark:bg-white/5">
            <p className="text-sm text-muted-foreground">Impressions</p>
            <p className="mt-3 font-display text-2xl font-semibold">{stats ? stats.impressions : "Locked"}</p>
          </div>
          <div className="rounded-[24px] bg-white/70 p-5 dark:bg-white/5">
            <p className="text-sm text-muted-foreground">Clicks</p>
            <p className="mt-3 font-display text-2xl font-semibold">{stats ? stats.clicks : "Locked"}</p>
          </div>
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{status}</p>
        <Button type="button" onClick={() => void handleDecrypt()} disabled={!campaigns.length || !selectedCampaignId}>
          Decrypt stats
        </Button>
      </div>
    </div>
  );
}
