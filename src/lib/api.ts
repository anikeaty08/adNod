import type { WalletClient } from "viem";
import type { ContractCampaign, SlotMetadata } from "@/lib/fhenix-contract";
import { createSignedRequestAuth, toSignedHeaders } from "@/lib/request-auth";

const isLocalPreview =
  typeof window !== "undefined" && (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost");

const API_URL = import.meta.env.VITE_API_URL || (isLocalPreview ? "http://127.0.0.1:4000" : "");

export interface CampaignMetadata {
  chainCampaignId: string;
  title: string;
  description: string;
  creativeURI: string;
  category: string;
  pricingModel: "CPC" | "CPM";
  rate: string;
  advertiser: string;
}

export interface PlatformStats {
  totalCampaigns: number;
  totalSlots: number;
  totalVerifiedTransactions: number;
}

export interface RequestAuthInput {
  address: string;
  walletClient: WalletClient;
}

async function readErrorMessage(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => ({ error: fallback }))) as { error?: string };
  return payload.error || fallback;
}

function normalizeCampaign(campaign: Record<string, unknown>): CampaignMetadata {
  return {
    chainCampaignId: String(campaign.chainCampaignId ?? ""),
    advertiser: String(campaign.advertiser ?? ""),
    title: String(campaign.title ?? ""),
    description: String(campaign.description ?? ""),
    creativeURI: String(campaign.creativeURI ?? campaign.creativeUrl ?? ""),
    category: String(campaign.category ?? ""),
    pricingModel: (String(campaign.pricingModel ?? "CPC") === "CPM" ? "CPM" : "CPC"),
    rate: String(campaign.rate ?? "0"),
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

export async function saveCampaignMetadata(campaign: CampaignMetadata, auth: RequestAuthInput): Promise<CampaignMetadata> {
  const signedAuth = await createSignedRequestAuth({
    action: "campaigns:create",
    address: auth.address,
    payload: campaign,
    walletClient: auth.walletClient,
  });
  const response = await fetch(`${API_URL}/api/campaigns`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...toSignedHeaders(signedAuth),
    },
    body: JSON.stringify({
      chainCampaignId: campaign.chainCampaignId,
      title: campaign.title,
      description: campaign.description,
      creativeURI: campaign.creativeURI,
      category: campaign.category,
      pricingModel: campaign.pricingModel,
      rate: campaign.rate,
      advertiser: campaign.advertiser,
    }),
  });

  if (!response.ok) throw new Error(await readErrorMessage(response, "Failed to save campaign."));
  const savedCampaign = (await response.json()) as Record<string, unknown>;
  return normalizeCampaign(savedCampaign);
}

export async function askAdNodeAssistant(
  prompt: string,
  history: AssistantChatTurn[] = [],
  auth: RequestAuthInput,
): Promise<{ reply: string; model: string }> {
  const payload = { prompt, history };
  const signedAuth = await createSignedRequestAuth({
    action: "assistant:ask",
    address: auth.address,
    payload,
    walletClient: auth.walletClient,
  });
  const response = await fetch(`${API_URL}/api/assistant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...toSignedHeaders(signedAuth),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Assistant request failed."));
  }

  return (await response.json()) as { reply: string; model: string };
}

function normalizeSlot(slot: Record<string, unknown>): SlotMetadata {
  return {
    chainSlotId: String(slot.chainSlotId ?? ""),
    siteName: String(slot.siteName ?? ""),
    siteUrl: String(slot.siteUrl ?? ""),
    category: String(slot.category ?? ""),
    dailyTrafficEstimate: String(slot.dailyTrafficEstimate ?? ""),
    developer: String(slot.developer ?? ""),
    assignedCampaignId: String(slot.assignedCampaignId ?? ""),
  };
}

export async function fetchSlots(): Promise<SlotMetadata[]> {
  const response = await fetch(`${API_URL}/api/slots`);
  if (!response.ok) throw new Error("Failed to load slots.");
  const slots = (await response.json()) as Record<string, unknown>[];
  return slots.map(normalizeSlot);
}

export async function saveSlot(slot: SlotMetadata, auth: RequestAuthInput): Promise<SlotMetadata> {
  const signedAuth = await createSignedRequestAuth({
    action: "slots:create",
    address: auth.address,
    payload: slot,
    walletClient: auth.walletClient,
  });
  const response = await fetch(`${API_URL}/api/slots`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...toSignedHeaders(signedAuth),
    },
    body: JSON.stringify(slot),
  });

  if (!response.ok) throw new Error(await readErrorMessage(response, "Failed to save slot."));
  return normalizeSlot((await response.json()) as Record<string, unknown>);
}

export async function updateSlotAssignment(chainSlotId: string, assignedCampaignId: string, auth: RequestAuthInput): Promise<SlotMetadata> {
  const payload = { assignedCampaignId };
  const signedAuth = await createSignedRequestAuth({
    action: "slots:assign",
    address: auth.address,
    payload,
    walletClient: auth.walletClient,
  });
  const response = await fetch(`${API_URL}/api/slot?chainSlotId=${encodeURIComponent(chainSlotId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...toSignedHeaders(signedAuth),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(await readErrorMessage(response, "Failed to update slot assignment."));
  return normalizeSlot((await response.json()) as Record<string, unknown>);
}
