import { PauseCircle, PlayCircle, Wallet } from "lucide-react";
import type { ContractCampaign } from "@/lib/fhenix-contract";
import { getIpfsGatewayUrl } from "@/lib/contract-client";

export function CampaignCard({ campaign }: { campaign: ContractCampaign }) {
  return (
    <div className="glass-panel rounded-[28px] p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:bg-sky-500/10 dark:text-sky-200">
            {campaign.category}
          </div>
          <h3 className="mt-4 font-display text-2xl font-semibold">{campaign.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{campaign.description}</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-white/70 px-3 py-2 text-xs font-medium capitalize dark:bg-white/5">
          {campaign.status === "active" ? (
            <PlayCircle className="h-4 w-4 text-emerald-500" />
          ) : (
            <PauseCircle className="h-4 w-4 text-amber-500" />
          )}
          {campaign.status}
        </div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[22px] bg-white/70 p-4 dark:bg-white/5">
          <p className="text-sm text-muted-foreground">Creative</p>
          <a className="mt-2 line-clamp-2 font-medium text-sky-700 dark:text-sky-300" href={getIpfsGatewayUrl(campaign.creativeURI)} target="_blank" rel="noreferrer">
            Open asset
          </a>
        </div>
        <div className="rounded-[22px] bg-white/70 p-4 dark:bg-white/5">
          <p className="text-sm text-muted-foreground">Impressions</p>
          <p className="mt-2 font-semibold">{campaign.impressions == null ? "Decrypt to view" : campaign.impressions.toLocaleString()}</p>
        </div>
        <div className="rounded-[22px] bg-white/70 p-4 dark:bg-white/5">
          <p className="text-sm text-muted-foreground">Clicks</p>
          <p className="mt-2 font-semibold">{campaign.clicks == null ? "Decrypt to view" : campaign.clicks.toLocaleString()}</p>
        </div>
      </div>
      <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Wallet className="h-4 w-4 text-sky-500" />
        {campaign.encryptedCpc ? `Decrypted CPC available` : "Financial data remains encrypted on-chain"}
      </div>
    </div>
  );
}
