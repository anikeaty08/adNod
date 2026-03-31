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
  const { isConfigured, setCampaignActive, getMyBudget, getMyStats } = useAdNode();
  const { connected, address } = useWallet();
  const [updatingCampaignId, setUpdatingCampaignId] = useState<number | null>(null);
  const [decryptingBudgetCampaignId, setDecryptingBudgetCampaignId] = useState<number | null>(null);
  const [decryptingStatsCampaignId, setDecryptingStatsCampaignId] = useState<number | null>(null);
  const [decryptedCampaigns, setDecryptedCampaigns] = useState<Record<string, { budget: string | null; impressions: number | null; clicks: number | null; status: string | null }>>({});
  const ownedCampaigns = address ? campaigns.filter((campaign) => campaign.advertiser.toLowerCase() === address.toLowerCase()) : [];
  const metrics = useCampaignMetrics(ownedCampaigns);
  const hosterMetrics = [
    {
      label: "Campaigns created",
      value: String(ownedCampaigns.length),
      hint: ownedCampaigns.length ? "Your campaigns from AdRegistry and metadata storage" : "No campaigns created yet",
    },
    {
      label: "Active campaigns",
      value: String(metrics.activeCount),
      hint: ownedCampaigns.length ? "Currently available to publishers" : "Create and activate your first campaign",
    },
    {
      label: "Encrypted budgets",
      value: ownedCampaigns.length ? "On-chain" : "Locked",
      hint: connected ? "Decrypt a campaign budget directly from its card." : "Connect your wallet to decrypt campaign budgets.",
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

  const handleDecryptBudget = async (campaignId: number) => {
    setDecryptingBudgetCampaignId(campaignId);
    setDecryptedCampaigns((current) => ({
      ...current,
      [String(campaignId)]: {
        budget: current[String(campaignId)]?.budget ?? null,
        impressions: current[String(campaignId)]?.impressions ?? null,
        clicks: current[String(campaignId)]?.clicks ?? null,
        status: "Requesting wallet permit for campaign budget...",
      },
    }));

    try {
      const budget = await getMyBudget(campaignId);
      setDecryptedCampaigns((current) => ({
        ...current,
        [String(campaignId)]: {
          budget,
          impressions: current[String(campaignId)]?.impressions ?? null,
          clicks: current[String(campaignId)]?.clicks ?? null,
          status: "Campaign budget decrypted with your wallet permit.",
        },
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Decrypt failed - check you are the campaign owner";
      setDecryptedCampaigns((current) => ({
        ...current,
        [String(campaignId)]: {
          budget: current[String(campaignId)]?.budget ?? null,
          impressions: current[String(campaignId)]?.impressions ?? null,
          clicks: current[String(campaignId)]?.clicks ?? null,
          status: message,
        },
      }));
    } finally {
      setDecryptingBudgetCampaignId(null);
    }
  };

  const handleDecryptStats = async (campaignId: number) => {
    setDecryptingStatsCampaignId(campaignId);
    setDecryptedCampaigns((current) => ({
      ...current,
      [String(campaignId)]: {
        budget: current[String(campaignId)]?.budget ?? null,
        impressions: current[String(campaignId)]?.impressions ?? null,
        clicks: current[String(campaignId)]?.clicks ?? null,
        status: "Requesting wallet permit for campaign stats...",
      },
    }));

    try {
      const stats = await getMyStats(campaignId);
      setDecryptedCampaigns((current) => ({
        ...current,
        [String(campaignId)]: {
          budget: current[String(campaignId)]?.budget ?? null,
          impressions: stats.impressions,
          clicks: stats.clicks,
          status: "Campaign stats decrypted with your wallet permit.",
        },
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Decrypt failed - check you are the campaign owner";
      setDecryptedCampaigns((current) => ({
        ...current,
        [String(campaignId)]: {
          budget: current[String(campaignId)]?.budget ?? null,
          impressions: current[String(campaignId)]?.impressions ?? null,
          clicks: current[String(campaignId)]?.clicks ?? null,
          status: message,
        },
      }));
    } finally {
      setDecryptingStatsCampaignId(null);
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
        <PerformancePanel campaigns={ownedCampaigns} statsByCampaign={decryptedCampaigns} />
      </div>
      {!isConfigured ? (
        <div className="mt-6 rounded-[28px] border border-amber-300/60 bg-amber-50/80 px-5 py-4 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100">
          Fhenix RPC or contract addresses are missing. Campaign creation and analytics decryption stay disabled until the Web3 environment is configured.
        </div>
      ) : null}
      <div className="mt-8 grid gap-5">
        {ownedCampaigns.length ? (
          ownedCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              showControls={Boolean(address) && campaign.advertiser.toLowerCase() === address?.toLowerCase()}
              onToggleActive={(campaignId, nextActive) => void handleToggleCampaign(campaignId, nextActive)}
              isUpdating={updatingCampaignId === Number(campaign.id)}
              onDecryptBudget={(campaignId) => void handleDecryptBudget(campaignId)}
              onDecryptStats={(campaignId) => void handleDecryptStats(campaignId)}
              isDecryptingBudget={decryptingBudgetCampaignId === Number(campaign.id)}
              isDecryptingStats={decryptingStatsCampaignId === Number(campaign.id)}
              decryptedBudget={decryptedCampaigns[campaign.id]?.budget ?? null}
              decryptedImpressions={decryptedCampaigns[campaign.id]?.impressions ?? null}
              decryptedClicks={decryptedCampaigns[campaign.id]?.clicks ?? null}
              decryptStatus={decryptedCampaigns[campaign.id]?.status ?? null}
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
