import { CampaignCard } from "@/components/dashboard/CampaignCard";
import { SnippetGenerator } from "@/components/docs/SnippetGenerator";
import { StatsCard } from "@/components/shared/StatsCard";
import { developerMetrics, marketplaceCampaigns } from "@/data/mock";

export function DeveloperDashboard() {
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
          <div className="mt-6 space-y-4">
            {[
              ["CMP-4021", "MAS 620", "Ready in 13m"],
              ["CMP-5177", "MAS 410", "Ready in 28m"],
              ["CMP-6310", "MAS 150", "Paused"],
            ].map(([campaign, payout, eta]) => (
              <div key={campaign} className="rounded-[24px] bg-white/70 p-4 dark:bg-white/5">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{campaign}</p>
                  <p className="text-sm text-sky-700 dark:text-sky-300">{payout}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{eta}</p>
              </div>
            ))}
          </div>
        </div>
        <SnippetGenerator />
      </div>
      <div className="mt-8 grid gap-5">
        {marketplaceCampaigns.map((campaign) => (
          <CampaignCard key={campaign.id} campaign={campaign} />
        ))}
      </div>
    </section>
  );
}
