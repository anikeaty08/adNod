import { useMemo, useState } from "react";
import { CampaignForm } from "@/components/dashboard/CampaignForm";
import { CampaignCard } from "@/components/dashboard/CampaignCard";
import { PerformancePanel } from "@/components/dashboard/PerformancePanel";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatsCard } from "@/components/shared/StatsCard";
import { Button } from "@/components/shared/Button";
import { useCampaignMetrics, useCampaigns } from "@/hooks/useCampaigns";
import { useAdNode } from "@/hooks/useAdNode";
import { useWallet } from "@/context/WalletContext";

export function HosterDashboard() {
  const { data: campaigns = [] } = useCampaigns();
  const { isConfigured, setCampaignActive, getMyBudget, getMyStats, fundCampaign } = useAdNode();
  const { connected, address } = useWallet();
  const [updatingCampaignId, setUpdatingCampaignId] = useState<number | null>(null);
  const [decryptingBudgetCampaignId, setDecryptingBudgetCampaignId] = useState<number | null>(null);
  const [decryptingStatsCampaignId, setDecryptingStatsCampaignId] = useState<number | null>(null);
  const [fundingCampaignId, setFundingCampaignId] = useState<number | null>(null);
  const [topUpAmounts, setTopUpAmounts] = useState<Record<string, string>>({});
  const [decryptedCampaigns, setDecryptedCampaigns] = useState<Record<string, { budget: string | null; impressions: number | null; clicks: number | null; status: string | null }>>({});
  const ownedCampaigns = address ? campaigns.filter((campaign) => campaign.advertiser.toLowerCase() === address.toLowerCase()) : [];
  const metrics = useCampaignMetrics(ownedCampaigns);
  const totalAvailableEscrow = useMemo(
    () => ownedCampaigns.reduce((sum, campaign) => sum + Number(campaign.availableEscrowEth || 0), 0).toFixed(3),
    [ownedCampaigns],
  );
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
      label: "Available escrow",
      value: ownedCampaigns.length ? `${totalAvailableEscrow} ETH` : "0 ETH",
      hint: "Campaign funding is now explicit and withdrawable only after the campaign is paused.",
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

  const handleFundCampaign = async (campaignId: number) => {
    const amount = topUpAmounts[String(campaignId)]?.trim() ?? "";
    if (!amount) {
      return;
    }

    setFundingCampaignId(campaignId);
    try {
      await fundCampaign(campaignId, amount);
    } finally {
      setFundingCampaignId(null);
    }
  };

  return (
    <section className="page-shell py-12 sm:py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">Hoster dashboard</p>
          <h1 className="mt-3 font-display text-4xl font-semibold">Fund and manage encrypted campaigns.</h1>
        </div>
        <p className="max-w-xl text-sm text-muted-foreground">
          Launch campaigns with real escrow, decrypt owner-only metrics, and keep funding controls anchored to on-chain state.
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
            <div key={campaign.id} className="space-y-4">
              <CampaignCard
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
              <div className="glass-panel rounded-[24px] p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-sm font-medium">Top up campaign escrow</p>
                    <p className="mt-1 text-sm text-muted-foreground">Add more funded balance without recreating the campaign.</p>
                  </div>
                  <div className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
                    <input
                      type="text"
                      className="w-full rounded-2xl border bg-white/80 px-4 py-3 dark:bg-slate-950/50"
                      placeholder="0.1"
                      value={topUpAmounts[campaign.id] ?? ""}
                      onChange={(event) =>
                        setTopUpAmounts((current) => ({
                          ...current,
                          [campaign.id]: event.target.value,
                        }))
                      }
                    />
                    <Button type="button" onClick={() => void handleFundCampaign(Number(campaign.id))} disabled={fundingCampaignId === Number(campaign.id)}>
                      {fundingCampaignId === Number(campaign.id) ? "Funding..." : "Top up"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
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
