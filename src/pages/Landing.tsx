import { Hero } from "@/components/marketing/Hero";
import { VideoHero } from "@/components/marketing/VideoHero";
import { SectionBadge } from "@/components/shared/SectionBadge";
import { tutorialCards } from "@/data/mock";
import { useCampaigns, usePlatformStats } from "@/hooks/useCampaigns";

export function Landing() {
  const { data: campaigns = [] } = useCampaigns();
  const { data: stats = null } = usePlatformStats();

  return (
    <div className="pb-16">
      <Hero campaigns={campaigns} stats={stats} />
      <VideoHero />
      <section className="page-shell py-10">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <SectionBadge>How it works</SectionBadge>
            <h2 className="section-title mt-5">Create. Encrypt. Earn.</h2>
            <p className="mt-4 text-muted-foreground">
              AdNode starts with a simple flow: Hosters create campaigns, financial values are encrypted before they reach the chain, and Developers earn from live placements without exposing campaign strategy.
            </p>
          </div>
          <div className="grid gap-4 lg:col-span-2 sm:grid-cols-3">
            {[
              "Create campaigns with public creatives, encrypted strategy fields, and funded escrow.",
              "Encrypt financial inputs in the browser before they are submitted on-chain.",
              "Route developer payouts through slot-linked settlement instead of manual dashboard theater.",
            ].map((step, index) => (
              <div key={step} className="glass-panel rounded-[28px] p-6">
                <p className="text-sm uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">Step 0{index + 1}</p>
                <p className="mt-4 font-medium">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="page-shell py-10">
        <div className="glass-panel rounded-[34px] p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <SectionBadge>Why AdNode</SectionBadge>
              <h2 className="section-title mt-5">A decentralized ad stack that still feels like premium SaaS.</h2>
            </div>
            <p className="max-w-xl text-sm text-muted-foreground">
              Confidential financial state on-chain, clear role-based workspaces, and honest product surfaces that only promise what is live today.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Campaigns", String(stats?.totalCampaigns ?? campaigns.length), "Pulled from campaign metadata and live chain state"],
              ["Registered slots", String(stats?.totalSlots ?? 0), "Developer inventory available for assignment"],
              ["On-chain objects", String(stats?.totalVerifiedTransactions ?? 0), "Campaign and slot entities surfaced from the live contracts"],
              ["Settlement", "Encrypted", "Financial values remain sealed until the owner decrypts them"],
            ].map(([label, value, detail]) => (
              <div key={label} className="rounded-[26px] bg-white/80 p-5 dark:bg-white/5">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-3 font-display text-2xl font-semibold">{value}</p>
                <p className="mt-2 text-sm text-sky-600 dark:text-sky-300">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="page-shell py-10">
        <div className="grid gap-4 md:grid-cols-3">
          {tutorialCards.map((card) => (
            <div key={card.title} className="glass-panel rounded-[28px] p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">{card.duration}</p>
              <h3 className="mt-4 font-display text-2xl font-semibold">{card.title}</h3>
              <p className="mt-3 text-sm text-muted-foreground">{card.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
