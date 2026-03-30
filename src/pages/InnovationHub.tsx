import { tutorialCards } from "@/data/mock";
import { SectionBadge } from "@/components/shared/SectionBadge";

export function InnovationHub() {
  return (
    <section className="page-shell py-12 sm:py-16">
      <SectionBadge>Innovation hub</SectionBadge>
      <h1 className="mt-5 font-display text-4xl font-semibold">Guides, tooling, and integration patterns for Fhenix builders.</h1>
      <p className="mt-4 max-w-3xl text-muted-foreground">
        Use these resources to roll out wallets, publisher embeds, fraud-resistant relays, and encrypted analytics pipelines.
      </p>
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {tutorialCards.map((card) => (
          <div key={card.title} className="glass-panel rounded-[28px] p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">{card.duration}</p>
            <h3 className="mt-4 font-display text-2xl font-semibold">{card.title}</h3>
            <p className="mt-3 text-sm text-muted-foreground">{card.description}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <div className="glass-panel rounded-[32px] p-7">
          <h3 className="font-display text-2xl font-semibold">Suggested implementation stack</h3>
          <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
            <li>React 18 + TypeScript + Wouter + Framer Motion</li>
            <li>Tailwind CSS with a shadcn-style component foundation</li>
            <li>Fhenix wallet integration and encrypted event attestations</li>
            <li>Optional relay API for anti-fraud and metadata indexing</li>
          </ul>
        </div>
        <div className="glass-panel rounded-[32px] p-7">
          <h3 className="font-display text-2xl font-semibold">Operational best practices</h3>
          <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
            <li>Require signed publisher attestations for click settlement.</li>
            <li>Cap payout velocity with campaign-level escrow checks.</li>
            <li>Index chain events for dashboards instead of polling every contract method.</li>
            <li>Use anomaly scoring before releasing high-value bursts of MAS.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
