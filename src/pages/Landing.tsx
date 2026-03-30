import { Hero } from "@/components/marketing/Hero";
import { VideoHero } from "@/components/marketing/VideoHero";
import { SectionBadge } from "@/components/shared/SectionBadge";
import { liveStats, tutorialCards } from "@/data/mock";

export function Landing() {
  return (
    <div className="pb-16">
      <Hero />
      <VideoHero />
      <section className="page-shell py-10">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <SectionBadge>How it works</SectionBadge>
            <h2 className="section-title mt-5">Built for both performance buyers and monetizing builders.</h2>
            <p className="mt-4 text-muted-foreground">
              Hosters launch escrow-funded campaigns while Developers plug in framework-ready slots that settle on verifiable traffic.
            </p>
          </div>
          <div className="grid gap-4 lg:col-span-2 sm:grid-cols-3">
            {[
              "Connect a Fhenix wallet and choose your role.",
              "Create or integrate campaigns with signed ad events.",
              "Settle MAS payouts automatically from escrow.",
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
              Privacy-preserving attribution, smooth operator workflows, and transparent settlement state for every campaign.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {liveStats.map((item) => (
              <div key={item.label} className="rounded-[26px] bg-white/80 p-5 dark:bg-white/5">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="mt-3 font-display text-2xl font-semibold">{item.value}</p>
                <p className="mt-2 text-sm text-sky-600 dark:text-sky-300">{item.delta}</p>
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
