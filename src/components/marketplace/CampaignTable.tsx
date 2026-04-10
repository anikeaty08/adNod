import type { ContractCampaign } from "@/lib/fhenix-contract";
import { EmptyState } from "@/components/shared/EmptyState";
import { getIpfsGatewayUrl } from "@/lib/contract-client";
import { Button } from "@/components/shared/Button";
import { useWallet } from "@/context/WalletContext";

function isVideoUri(uri: string) {
  const value = uri.toLowerCase();
  return value.includes(".mp4") || value.includes(".webm") || value.includes("video");
}

export function CampaignTable({ campaigns }: { campaigns: ContractCampaign[] }) {
  const { connected } = useWallet();

  if (!campaigns.length) {
    return (
      <EmptyState
        title="No campaigns match your filters"
        description="Try another category or search term, or wait for the next active AdNode campaign."
      />
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
      {campaigns.map((campaign) => {
        const assetUrl = getIpfsGatewayUrl(campaign.creativeURI);
        const isVideo = isVideoUri(assetUrl);

        return (
          <div key={campaign.id} className="glass-panel overflow-hidden rounded-[32px] p-5">
            <div className="overflow-hidden rounded-[24px] bg-sky-50 dark:bg-slate-900/70">
              {isVideo ? (
                <video className="h-56 w-full object-cover" src={assetUrl} controls playsInline preload="metadata" />
              ) : (
                <img className="h-56 w-full object-cover" src={assetUrl} alt={campaign.title} />
              )}
            </div>
            <div className="mt-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-2xl font-semibold">{campaign.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{campaign.description}</p>
              </div>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:bg-sky-500/10 dark:text-sky-200">
                {campaign.category}
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[20px] bg-white/70 p-4 text-sm dark:bg-white/5">
                <p className="text-muted-foreground">Pricing model</p>
                <p className="mt-2 font-medium">{campaign.pricingModel}</p>
              </div>
              <div className="rounded-[20px] bg-white/70 p-4 text-sm dark:bg-white/5">
                <p className="text-muted-foreground">Rate</p>
                <p className="mt-2 font-medium">{campaign.rate ? `${campaign.rate} ETH` : "Set by hoster"}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <a
                className="inline-flex items-center justify-center rounded-full bg-secondary px-5 py-3 text-sm font-semibold text-secondary-foreground transition hover:bg-secondary/80"
                href={assetUrl}
                target="_blank"
                rel="noreferrer"
              >
                View details
              </a>
              {!connected ? <p className="text-xs text-muted-foreground">Connect wallet to add this to your slot.</p> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
