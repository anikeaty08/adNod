import { useState } from "react";
import { CampaignForm } from "@/components/dashboard/CampaignForm";
import { CampaignCard } from "@/components/dashboard/CampaignCard";
import { PerformancePanel } from "@/components/dashboard/PerformancePanel";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatsCard } from "@/components/shared/StatsCard";
import { useCampaignMetrics, useCampaigns } from "@/hooks/useCampaigns";
import { useAdNode } from "@/hooks/useAdNode";
import { useWallet } from "@/context/WalletContext";

export function HosterDashboard() {
  const { data: campaigns = [] } = useCampaigns();
  const metrics = useCampaignMetrics(campaigns);
  const { isConfigured, setCampaignActive } = useAdNode();
  const { connected, address } = useWallet();
  const [updatingCampaignId, setUpdatingCampaignId] = useState<number | null>(null);
  const hosterMetrics = [
    {
      label: "Campaigns created",
      value: String(campaigns.length),
      hint: campaigns.length ? "Read from AdRegistry with metadata from the API" : "No campaigns created yet",
    },
    {
      label: "Active campaigns",
      value: String(metrics.activeCount),
      hint: campaigns.length ? "Currently available to publishers" : "Create and activate your first campaign",
    },
    {
      label: "Encrypted budgets",
      value: campaigns.length ? "On-chain" : "Locked",
      hint: connected ? "Decrypt a campaign budget from the panel below." : "Connect your wallet to decrypt campaign budgets.",
    },
    {
      label: "Analytics access",
      value: connected ? "Permit ready" : "Wallet required",
      hint: isConfigured ? "Only the campaign owner can decrypt stats." : "Add contract addresses and RPC before using encrypted analytics.",
    },
  ];

  const handleToggleCampaign = async (campaignId: number, nextActive: boolean) => {
    setUpdatingCampaignId(campaignId);
    try {
      await setCampaignActive(campaignId, nextActive);
    } finally {
      setUpdatingCampaignId(null);
    }
  };

  return (
    <section className="page-shell py-12 sm:py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">Hoster dashboard</p>
          <h1 className="mt-3 font-display text-4xl font-semibold">Commercial-grade campaign control.</h1>
        </div>
        <p className="max-w-xl text-sm text-muted-foreground">
          Monitor verified performance, refresh escrow, and manage pricing models from one chain-native console.
        </p>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {hosterMetrics.map((metric) => (
          <StatsCard key={metric.label} {...metric} />
        ))}
      </div>
      <div className="mt-8 grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
        <CampaignForm />
        <PerformancePanel campaigns={campaigns} />
      </div>
      {!isConfigured ? (
        <div className="mt-6 rounded-[28px] border border-amber-300/60 bg-amber-50/80 px-5 py-4 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100">
          Fhenix RPC or contract addresses are missing. Campaign creation and analytics decryption stay disabled until the Web3 environment is configured.
        </div>
      ) : null}
      <div className="mt-8 grid gap-5">
        {campaigns.length ? (
          campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              showControls={Boolean(address) && campaign.advertiser.toLowerCase() === address?.toLowerCase()}
              onToggleActive={(campaignId, nextActive) => void handleToggleCampaign(campaignId, nextActive)}
              isUpdating={updatingCampaignId === Number(campaign.id)}
            />
          ))
        ) : (
          <EmptyState
            title="No hoster campaigns yet"
            description="Use the form above after connecting your wallet provider. Newly created campaigns will appear here instead of demo records."
          />
        )}
      </div>
    </section>
  );
}
