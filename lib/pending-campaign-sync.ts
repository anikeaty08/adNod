"use client";

type PendingCampaignSync = {
  chainCampaignId: string;
  txHash: `0x${string}`;
  title?: string;
  description?: string;
  category?: string;
  pricingModel?: "CPC" | "CPM";
  rate?: string;
  updatedAt: number;
};

const KEY = "adnode_pending_campaign_sync_v1";
const MAX = 5;

function safeParse(raw: string | null): PendingCampaignSync[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean) as PendingCampaignSync[];
  } catch {
    return [];
  }
}

export function loadPendingCampaignSync(): PendingCampaignSync[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(KEY));
}

export function savePendingCampaignSync(entry: Omit<PendingCampaignSync, "updatedAt">) {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const prev = loadPendingCampaignSync();
  const next: PendingCampaignSync[] = [
    { ...entry, updatedAt: now },
    ...prev.filter((p) => p.chainCampaignId !== entry.chainCampaignId),
  ].slice(0, MAX);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function clearPendingCampaignSync(chainCampaignId: string) {
  if (typeof window === "undefined") return;
  const prev = loadPendingCampaignSync();
  const next = prev.filter((p) => p.chainCampaignId !== chainCampaignId);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}
