import { useMemo, useState } from "react";
import { CampaignTable } from "@/components/marketplace/CampaignTable";
import { SectionBadge } from "@/components/shared/SectionBadge";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useAdNode } from "@/hooks/useAdNode";

export function Marketplace() {
  const { data: campaigns = [] } = useCampaigns();
  const { isConfigured } = useAdNode();
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest");
  const categories = useMemo(() => Array.from(new Set(campaigns.map((campaign) => campaign.category))).sort(), [campaigns]);
  const filteredCampaigns = useMemo(() => {
    const next = campaigns.filter((campaign) => category === "all" || campaign.category === category);
    if (sort === "newest") {
      return [...next].sort((left, right) => Number(right.id) - Number(left.id));
    }
    return next;
  }, [campaigns, category, sort]);

  return (
    <section className="page-shell py-12 sm:py-16">
      <SectionBadge>Open marketplace</SectionBadge>
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-semibold">Discover escrow-backed campaigns.</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Browse current campaign metadata, open public creative assets, and review what is live today.
          </p>
        </div>
        <div className="rounded-[24px] bg-white/70 px-5 py-4 text-sm text-muted-foreground dark:bg-white/5">
          {isConfigured ? "Public listings come from AdRegistry. Financial metrics stay encrypted for owners only." : "Configure Fhenix RPC and contract addresses to load marketplace campaigns."}
        </div>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span>Filter by category</span>
          <select className="w-full rounded-2xl border bg-white/80 px-4 py-3 dark:bg-slate-950/50" value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span>Sort</span>
          <select className="w-full rounded-2xl border bg-white/80 px-4 py-3 dark:bg-slate-950/50" value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="newest">Newest first</option>
          </select>
        </label>
      </div>
      <div className="mt-8">
        <CampaignTable campaigns={filteredCampaigns} />
      </div>
    </section>
  );
}
