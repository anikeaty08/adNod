import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ContractCampaign, SlotMetadata } from "@/lib/fhenix-contract";
import { useAdNode } from "@/hooks/useAdNode";

const campaignKey = ["campaigns"];

export function useCampaigns() {
  const { getPublicCampaigns } = useAdNode();

  return useQuery({
    queryKey: campaignKey,
    queryFn: getPublicCampaigns,
  });
}

export function usePlatformStats() {
  const { getPlatformStats } = useAdNode();

  return useQuery({
    queryKey: ["platform-stats"],
    queryFn: getPlatformStats,
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

export function useSlots() {
  const { getPublicSlots } = useAdNode();

  return useQuery({
    queryKey: ["slots"],
    queryFn: getPublicSlots,
  });
}

export function useSlotMetrics(slots: SlotMetadata[]) {
  return useMemo(() => {
    const assignedCount = slots.filter((slot) => Boolean(slot.assignedCampaignId)).length;

    return {
      assignedCount,
      totalTraffic: slots.reduce((sum, slot) => sum + Number(slot.dailyTrafficEstimate || 0), 0),
    };
  }, [slots]);
}
