import { CampaignTable } from "@/components/marketplace/CampaignTable";
import { SectionBadge } from "@/components/shared/SectionBadge";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useAdNode } from "@/hooks/useAdNode";

export function Marketplace() {
  const { data: campaigns = [] } = useCampaigns();
  const { isConfigured } = useAdNode();

  return (
    <section className="page-shell py-12 sm:py-16">
      <SectionBadge>Open marketplace</SectionBadge>
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-semibold">Discover escrow-backed campaigns.</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Filter active opportunities, inspect pricing models, and choose inventory with transparent settlement backing.
          </p>
        </div>
        <div className="rounded-[24px] bg-white/70 px-5 py-4 text-sm text-muted-foreground dark:bg-white/5">
          {isConfigured ? "Public listings come from AdRegistry. Financial metrics stay encrypted for owners only." : "Configure Fhenix RPC and contract addresses to load marketplace campaigns."}
        </div>
      </div>
      <div className="mt-8">
        <CampaignTable campaigns={campaigns} />
      </div>
    </section>
  );
}
