import { CampaignCard } from "@/components/dashboard/CampaignCard";
import { SnippetGenerator } from "@/components/docs/SnippetGenerator";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatsCard } from "@/components/shared/StatsCard";
import { useCampaignMetrics, useCampaigns } from "@/hooks/useCampaigns";
import { formatCompact } from "@/lib/utils";

export function DeveloperDashboard() {
  const { data: campaigns = [] } = useCampaigns();
  const metrics = useCampaignMetrics(campaigns);
  const developerMetrics = [
    {
      label: "Open campaigns",
      value: String(metrics.activeCount),
      hint: campaigns.length ? "Available for publisher integration" : "No open demand yet",
    },
    {
      label: "Tracked impressions",
      value: formatCompact(metrics.totalImpressions),
      hint: campaigns.length ? "From stored campaign records" : "Will appear after real traffic",
    },
    {
      label: "Tracked clicks",
      value: formatCompact(metrics.totalClicks),
      hint: "Aggregated from live campaign data",
    },
    {
      label: "Escrow supply",
      value: `MAS ${formatCompact(metrics.totalEscrow)}`,
      hint: campaigns.length ? "Available in listed campaigns" : "Awaiting first funded campaign",
    },
  ];

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
          <h3 className="font-display text-2xl font-semibold">Earnings release queue</h3>
          {campaigns.length ? (
            <div className="mt-6 space-y-4">
              {campaigns.slice(0, 3).map((campaign) => (
                <div key={campaign.id} className="rounded-[24px] bg-white/70 p-4 dark:bg-white/5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{campaign.id}</p>
                    <p className="text-sm text-sky-700 dark:text-sky-300">MAS {formatCompact(campaign.escrowedMas)}</p>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground capitalize">{campaign.status} campaign in the current marketplace feed.</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">No payout queue yet. Campaign-backed earnings will appear after real hoster campaigns are added.</p>
          )}
        </div>
        <SnippetGenerator />
      </div>
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
