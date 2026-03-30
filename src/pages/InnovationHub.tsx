import { SectionBadge } from "@/components/shared/SectionBadge";

export function InnovationHub() {
  return (
    <section className="page-shell py-12 sm:py-16">
      <SectionBadge>AdNode platform</SectionBadge>
      <h1 className="mt-5 font-display text-4xl font-semibold">A real workspace for decentralized advertising operations.</h1>
      <p className="mt-4 max-w-3xl text-muted-foreground">
        AdNode is built to help Hosters launch funded campaigns and help Developers monetize placements through a cleaner,
        blockchain-native workflow that feels like a commercial SaaS product.
      </p>
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {[
          {
            title: "Role-based onboarding",
            description: "Every user chooses whether they are joining AdNode as a Hoster or a Developer, then completes a profile before entering the workspace.",
          },
          {
            title: "Campaign funding flow",
            description: "Hosters create campaigns, define budgets and pricing, and prepare listings for publisher distribution through the platform.",
          },
          {
            title: "Publisher-ready delivery",
            description: "Developers browse active campaigns, copy integration snippets, and manage monetization from one dedicated dashboard.",
          },
        ].map((card) => (
          <div key={card.title} className="glass-panel rounded-[28px] p-6">
            <h3 className="mt-1 font-display text-2xl font-semibold">{card.title}</h3>
            <p className="mt-3 text-sm text-muted-foreground">{card.description}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <div className="glass-panel rounded-[32px] p-7">
          <h3 className="font-display text-2xl font-semibold">For Hosters</h3>
          <div className="mt-5 space-y-3 text-sm text-muted-foreground">
            <p>Create ad campaigns with title, description, creative link, budget, and pricing model.</p>
            <p>Manage campaign state from a dedicated dashboard designed around visibility and control.</p>
            <p>Track what is live in the marketplace instead of juggling campaign data across separate tools.</p>
            <p>Move from wallet connection to profile setup to campaign publishing in a single flow.</p>
          </div>
        </div>
        <div className="glass-panel rounded-[32px] p-7">
          <h3 className="font-display text-2xl font-semibold">For Developers</h3>
          <div className="mt-5 space-y-3 text-sm text-muted-foreground">
            <p>Browse the available campaign marketplace without fake data crowding the workspace.</p>
            <p>Use multi-framework snippets to place AdNode inventory inside apps, websites, or dApps.</p>
            <p>Keep wallet-based identity, profile type, and publishing flow aligned inside one interface.</p>
            <p>See only meaningful states: live listings, empty states, and role-specific actions.</p>
          </div>
        </div>
      </div>
      <div className="mt-8 glass-panel rounded-[32px] p-7">
        <h3 className="font-display text-2xl font-semibold">Why this page exists</h3>
        <p className="mt-4 max-w-4xl text-sm text-muted-foreground">
          This section is no longer a generic tutorial or implementation checklist. It now explains what AdNode actually
          does inside the product: onboarding users, separating Hoster and Developer journeys, supporting wallet-based
          access, and giving each side a dedicated workspace for campaign execution.
        </p>
      </div>
    </section>
  );
}
