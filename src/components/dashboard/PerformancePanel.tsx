import type { ContractCampaign } from "@/lib/fhenix-contract";
import { MiniBarChart } from "@/components/shared/MiniBarChart";

export function PerformancePanel({ campaigns }: { campaigns: ContractCampaign[] }) {
  const chartCampaigns = campaigns.slice(0, 7);
  const labels = chartCampaigns.map((campaign) => campaign.id);
  const budgets = chartCampaigns.map((campaign) => campaign.escrowedMas);
  const clicks = chartCampaigns.map((campaign) => campaign.clicks);
  const impressions = chartCampaigns.map((campaign) => campaign.impressions);

  return (
    <div className="glass-panel rounded-[32px] p-7">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl font-semibold">Performance trend</h3>
          <p className="mt-2 text-sm text-muted-foreground">Spend, clicks, and impression velocity over the last week.</p>
        </div>
        <div className="rounded-full bg-white/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 dark:bg-white/5 dark:text-sky-200">
          Live analytics
        </div>
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div>
          <p className="mb-4 text-sm text-muted-foreground">Escrow by campaign</p>
          <MiniBarChart values={budgets.length ? budgets : [0, 0, 0, 0]} />
        </div>
        <div>
          <p className="mb-4 text-sm text-muted-foreground">Clicks</p>
          <MiniBarChart values={clicks.length ? clicks : [0, 0, 0, 0]} color="from-cyan-400 to-sky-300" />
        </div>
        <div>
          <p className="mb-4 text-sm text-muted-foreground">Impressions</p>
          <MiniBarChart values={impressions.length ? impressions : [0, 0, 0, 0]} color="from-blue-500 to-sky-400" />
        </div>
      </div>
      <div
        className="mt-6 grid gap-2 text-center text-xs text-muted-foreground"
        style={{
          gridTemplateColumns: `repeat(${(labels.length ? labels : ["New", "Data", "Will", "Appear"]).length}, minmax(0, 1fr))`,
        }}
      >
        {(labels.length ? labels : ["New", "Data", "Will", "Appear"]).map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
    </div>
  );
}
