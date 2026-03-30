import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ContractCampaign } from "@/lib/fhenix-contract";
import { useAdNode } from "@/hooks/useAdNode";

const campaignKey = ["campaigns"];

export function useCampaigns() {
  const { getPublicCampaigns } = useAdNode();

  return useQuery({
    queryKey: campaignKey,
    queryFn: getPublicCampaigns,
  });
}

export function useCampaignMetrics(campaigns: ContractCampaign[]) {
  return useMemo(() => {
    const activeCount = campaigns.filter((campaign) => campaign.status === "active").length;

    return {
      activeCount,
    };
  }, [campaigns]);
}
