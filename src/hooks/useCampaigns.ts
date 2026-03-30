import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CampaignInput, ContractCampaign } from "@/lib/fhenix-contract";
import { createCampaignOnChain, fundCampaignEscrow } from "@/lib/fhenix-contract";
import { fetchCampaigns, saveCampaign } from "@/lib/api";

const campaignKey = ["campaigns"];

export function useCampaigns() {
  return useQuery({
    queryKey: campaignKey,
    queryFn: fetchCampaigns,
  });
}

export function useCampaignMetrics(campaigns: ContractCampaign[]) {
  return useMemo(() => {
    const activeCount = campaigns.filter((campaign) => campaign.status === "active").length;
    const totalEscrow = campaigns.reduce((sum, campaign) => sum + campaign.escrowedMas, 0);
    const totalImpressions = campaigns.reduce((sum, campaign) => sum + campaign.impressions, 0);
    const totalClicks = campaigns.reduce((sum, campaign) => sum + campaign.clicks, 0);

    return {
      activeCount,
      totalEscrow,
      totalImpressions,
      totalClicks,
    };
  }, [campaigns]);
}

export function useCreateCampaign(advertiser: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CampaignInput) => {
      const campaign = await createCampaignOnChain(input, advertiser ?? "wallet-not-connected");
      await fundCampaignEscrow(campaign.id, input.budget);
      return saveCampaign(campaign);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: campaignKey });
    },
  });
}
