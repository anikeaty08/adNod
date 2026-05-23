import adRegistryAbi from "../lib/abi/registry-abi.json" with { type: "json" };
import { getCampaigns } from "./campaign-store.js";
import { adRegistryAddress, serverPublicClient } from "./chain-state.js";
import { getSlots } from "./slot-store.js";

const ACCESS_LABELS = ["None", "Requested", "Approved", "Denied", "Revoked"] as const;

export async function listAccessRequests() {
  if (!adRegistryAddress) throw new Error("AdRegistry is not configured.");

  const [campaigns, slots] = await Promise.all([getCampaigns(), getSlots()]);
  const rows: Array<Record<string, unknown>> = [];

  for (const campaign of campaigns as Array<Record<string, unknown>>) {
    const campaignId = String(campaign.chainCampaignId ?? "");
    if (!/^\d+$/.test(campaignId)) continue;
    for (const slot of slots as Array<Record<string, unknown>>) {
      const slotId = String(slot.chainSlotId ?? "");
      if (!/^\d+$/.test(slotId)) continue;
      const raw = (await serverPublicClient.readContract({
        address: adRegistryAddress,
        abi: adRegistryAbi as any,
        functionName: "accessStatus",
        args: [BigInt(campaignId), BigInt(slotId)],
      })) as number | bigint;
      const statusCode = Number(raw);
      if (statusCode === 0) continue;
      rows.push({
        campaignId,
        slotId,
        campaignTitle: String(campaign.title ?? `Campaign ${campaignId}`),
        slotName: String(slot.siteName ?? `Slot ${slotId}`),
        developer: String(slot.developer ?? ""),
        statusCode,
        status: ACCESS_LABELS[statusCode] ?? `Status ${statusCode}`,
      });
    }
  }

  return rows.sort((a, b) => Number(a.statusCode ?? 0) - Number(b.statusCode ?? 0));
}
