import type { ContractCampaign } from "@/lib/fhenix-contract";

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "" : "http://127.0.0.1:4000");

export interface CampaignMetadata {
  chainCampaignId: string;
  title: string;
  description: string;
  creativeURI: string;
  category: string;
  advertiser: string;
}

function normalizeCampaign(campaign: Record<string, unknown>): CampaignMetadata {
  return {
    chainCampaignId: String(campaign.chainCampaignId ?? ""),
    advertiser: String(campaign.advertiser ?? ""),
    title: String(campaign.title ?? ""),
    description: String(campaign.description ?? ""),
    creativeURI: String(campaign.creativeURI ?? campaign.creativeUrl ?? ""),
    category: String(campaign.category ?? ""),
  };
}

export interface AssistantChatTurn {
  role: "user" | "assistant";
  content: string;
}

export async function fetchCampaignMetadata(): Promise<CampaignMetadata[]> {
  const response = await fetch(`${API_URL}/api/campaigns`);
  if (!response.ok) throw new Error("Failed to load campaigns.");
  const campaigns = (await response.json()) as Record<string, unknown>[];
  return campaigns.map(normalizeCampaign);
}

export async function saveCampaignMetadata(campaign: CampaignMetadata): Promise<CampaignMetadata> {
  const response = await fetch(`${API_URL}/api/campaigns`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chainCampaignId: campaign.chainCampaignId,
      title: campaign.title,
      description: campaign.description,
      creativeURI: campaign.creativeURI,
      category: campaign.category,
      advertiser: campaign.advertiser,
    }),
  });

  if (!response.ok) throw new Error("Failed to save campaign.");
  const savedCampaign = (await response.json()) as Record<string, unknown>;
  return normalizeCampaign(savedCampaign);
}

export async function askAdNodeAssistant(prompt: string, history: AssistantChatTurn[] = []): Promise<{ reply: string; model: string }> {
  const response = await fetch(`${API_URL}/api/assistant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, history }),
  });

  if (!response.ok) {
    throw new Error("Assistant request failed.");
  }

  return (await response.json()) as { reply: string; model: string };
}
