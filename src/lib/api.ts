import type { ContractCampaign } from "@/lib/fhenix-contract";

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "" : "http://127.0.0.1:4000");

function normalizeCampaign(campaign: Record<string, unknown>): ContractCampaign {
  return {
    id: String(campaign.id ?? campaign.chainCampaignId ?? ""),
    advertiser: String(campaign.advertiser ?? ""),
    title: String(campaign.title ?? ""),
    description: String(campaign.description ?? ""),
    creativeUrl: String(campaign.creativeUrl ?? ""),
    budget: Number(campaign.budget ?? 0),
    escrowedMas: Number(campaign.escrowedMas ?? campaign.budget ?? 0),
    pricingModel: (campaign.pricingModel as ContractCampaign["pricingModel"]) ?? "CPC",
    rate: Number(campaign.rate ?? 0),
    impressions: Number(campaign.impressions ?? 0),
    clicks: Number(campaign.clicks ?? 0),
    status: (campaign.status as ContractCampaign["status"]) ?? "active",
  };
}

export async function fetchCampaigns(): Promise<ContractCampaign[]> {
  const response = await fetch(`${API_URL}/api/campaigns`);
  if (!response.ok) throw new Error("Failed to load campaigns.");
  const campaigns = (await response.json()) as Record<string, unknown>[];
  return campaigns.map(normalizeCampaign);
}

export async function saveCampaign(campaign: ContractCampaign): Promise<ContractCampaign> {
  const response = await fetch(`${API_URL}/api/campaigns`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chainCampaignId: campaign.id,
      title: campaign.title,
      description: campaign.description,
      creativeUrl: campaign.creativeUrl,
      pricingModel: campaign.pricingModel,
      budget: campaign.budget,
      escrowedMas: campaign.escrowedMas,
      impressions: campaign.impressions,
      clicks: campaign.clicks,
      status: campaign.status,
      advertiser: campaign.advertiser,
      rate: campaign.rate,
    }),
  });

  if (!response.ok) throw new Error("Failed to save campaign.");
  const savedCampaign = (await response.json()) as Record<string, unknown>;
  return normalizeCampaign(savedCampaign);
}
