import { CampaignForm } from "@/components/dashboard/CampaignForm";
import { CampaignCard } from "@/components/dashboard/CampaignCard";
import { PerformancePanel } from "@/components/dashboard/PerformancePanel";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatsCard } from "@/components/shared/StatsCard";
import { useCampaignMetrics, useCampaigns } from "@/hooks/useCampaigns";
import { formatCompact } from "@/lib/utils";

export function HosterDashboard() {
  const { data: campaigns = [] } = useCampaigns();
  const metrics = useCampaignMetrics(campaigns);
  const hosterMetrics = [
    {
      label: "Campaigns created",
      value: String(campaigns.length),
      hint: campaigns.length ? "Saved in the AdNode API" : "No campaigns created yet",
    },
    {
      label: "Active campaigns",
      value: String(metrics.activeCount),
      hint: campaigns.length ? "Currently available to publishers" : "Create and activate your first campaign",
    },
    {
      label: "Escrow tracked",
      value: `MAS ${formatCompact(metrics.totalEscrow)}`,
      hint: "Computed from saved campaigns",
    },
    {
      label: "Tracked clicks",
      value: formatCompact(metrics.totalClicks),
      hint: campaigns.length ? "Live campaign totals" : "Metrics appear after real events are recorded",
    },
  ];

  return (
    <section className="page-shell py-12 sm:py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">Hoster dashboard</p>
          <h1 className="mt-3 font-display text-4xl font-semibold">Commercial-grade campaign control.</h1>
        </div>
        <p className="max-w-xl text-sm text-muted-foreground">
          Monitor verified performance, refresh escrow, and manage pricing models from one chain-native console.
        </p>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {hosterMetrics.map((metric) => (
          <StatsCard key={metric.label} {...metric} />
        ))}
      </div>
      <div className="mt-8 grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <CampaignForm />
        <PerformancePanel campaigns={campaigns} />
      </div>
      <div className="mt-8 grid gap-5">
        {campaigns.length ? (
          campaigns.map((campaign) => <CampaignCard key={campaign.id} campaign={campaign} />)
        ) : (
          <EmptyState
            title="No hoster campaigns yet"
            description="Use the form above after connecting your wallet provider. Newly created campaigns will appear here instead of demo records."
          />
        )}
      </div>
    </section>
  );
}
