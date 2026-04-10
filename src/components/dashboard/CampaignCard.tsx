import { PauseCircle, PlayCircle, Square, Wallet } from "lucide-react";
import type { ContractCampaign } from "@/lib/fhenix-contract";
import { getIpfsGatewayUrl } from "@/lib/contract-client";
import { Button } from "@/components/shared/Button";

function isVideoUri(uri: string) {
  const value = uri.toLowerCase();
  return value.includes(".mp4") || value.includes(".webm") || value.includes("video");
}

export function CampaignCard({
  campaign,
  showControls = false,
  onToggleActive,
  isUpdating = false,
  onDecryptBudget,
  onDecryptStats,
  isDecryptingBudget = false,
  isDecryptingStats = false,
  decryptedBudget,
  decryptedImpressions,
  decryptedClicks,
  decryptStatus,
}: {
  campaign: ContractCampaign;
  showControls?: boolean;
  onToggleActive?: (campaignId: number, nextActive: boolean) => void;
  isUpdating?: boolean;
  onDecryptBudget?: (campaignId: number) => void;
  onDecryptStats?: (campaignId: number) => void;
  isDecryptingBudget?: boolean;
  isDecryptingStats?: boolean;
  decryptedBudget?: string | null;
  decryptedImpressions?: number | null;
  decryptedClicks?: number | null;
  decryptStatus?: string | null;
}) {
  const creativeUrl = getIpfsGatewayUrl(campaign.creativeURI);

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
      <div className="mt-6 overflow-hidden rounded-[22px] bg-sky-50 dark:bg-slate-900/70">
        {isVideoUri(creativeUrl) ? (
          <video className="h-56 w-full object-cover" src={creativeUrl} controls playsInline preload="metadata" />
        ) : (
          <img className="h-56 w-full object-cover" src={creativeUrl} alt={campaign.title} />
        )}
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-5">
        <div className="rounded-[22px] bg-white/70 p-4 dark:bg-white/5">
          <p className="text-sm text-muted-foreground">Creative</p>
          <a className="mt-2 line-clamp-2 font-medium text-sky-700 dark:text-sky-300" href={creativeUrl} target="_blank" rel="noreferrer">
            Open asset
          </a>
        </div>
        <div className="rounded-[22px] bg-white/70 p-4 dark:bg-white/5">
          <p className="text-sm text-muted-foreground">Confidential budget</p>
          <p className="mt-2 font-semibold">{decryptedBudget ? `${decryptedBudget} ETH` : "Decrypt to view"}</p>
        </div>
        <div className="rounded-[22px] bg-white/70 p-4 dark:bg-white/5">
          <p className="text-sm text-muted-foreground">Available escrow</p>
          <p className="mt-2 font-semibold">{campaign.availableEscrowEth ? `${campaign.availableEscrowEth} ETH` : "No funding yet"}</p>
        </div>
        <div className="rounded-[22px] bg-white/70 p-4 dark:bg-white/5">
          <p className="text-sm text-muted-foreground">Impressions</p>
          <p className="mt-2 font-semibold">{typeof decryptedImpressions === "number" ? decryptedImpressions.toLocaleString() : "Decrypt to view"}</p>
        </div>
        <div className="rounded-[22px] bg-white/70 p-4 dark:bg-white/5">
          <p className="text-sm text-muted-foreground">Clicks</p>
          <p className="mt-2 font-semibold">{typeof decryptedClicks === "number" ? decryptedClicks.toLocaleString() : "Decrypt to view"}</p>
        </div>
      </div>
      <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Wallet className="h-4 w-4 text-sky-500" />
        {campaign.pricingModel === "CPC" ? "CPC pricing is stored encrypted on-chain." : "Financial data remains encrypted on-chain"}
      </div>
      {showControls ? (
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onToggleActive?.(Number(campaign.id), campaign.status !== "active")}
            disabled={isUpdating}
          >
            {campaign.status === "active" ? "Pause campaign" : "Resume campaign"}
          </Button>
          <Button type="button" variant="ghost" disabled>
            <Square className="mr-2 h-4 w-4" />
            Stop campaign
          </Button>
          <Button type="button" variant="secondary" onClick={() => onDecryptBudget?.(Number(campaign.id))} disabled={isDecryptingBudget}>
            {isDecryptingBudget ? "Decrypting budget..." : "Decrypt budget"}
          </Button>
          <Button type="button" onClick={() => onDecryptStats?.(Number(campaign.id))} disabled={isDecryptingStats}>
            {isDecryptingStats ? "Decrypting stats..." : "Decrypt stats"}
          </Button>
          <p className="self-center text-xs text-muted-foreground">Stop control is coming soon while permanent close-out logic is finalized on-chain.</p>
        </div>
      ) : null}
      {decryptStatus ? <p className="mt-3 text-sm text-muted-foreground">{decryptStatus}</p> : null}
    </div>
  );
}
