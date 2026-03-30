export type PricingModel = "CPC" | "CPM" | "HYBRID";

export interface CampaignInput {
  title: string;
  description: string;
  creativeUrl: string;
  budget: number;
  pricingModel: PricingModel;
  rate: number;
}

export interface ContractCampaign extends CampaignInput {
  id: string;
  advertiser: string;
  escrowedMas: number;
  impressions: number;
  clicks: number;
  status: "active" | "paused" | "completed";
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function connectFhenixWallet() {
  await wait(600);
  return {
    address: "0xA3dN0De89764B81293d751E7F65cC1191Fe10abc",
    network: "Fhenix Helium",
    sdkReady: false,
  };
}

export async function createCampaignOnChain(input: CampaignInput): Promise<ContractCampaign> {
  await wait(750);
  return {
    ...input,
    id: `CMP-${Math.floor(Math.random() * 9000 + 1000)}`,
    advertiser: "0xA3dN0De89764B81293d751E7F65cC1191Fe10abc",
    escrowedMas: input.budget,
    impressions: 0,
    clicks: 0,
    status: "active",
  };
}

export async function fundCampaignEscrow(campaignId: string, amount: number) {
  await wait(500);
  return {
    campaignId,
    amount,
    txHash: `0xescrow${Math.random().toString(16).slice(2, 12)}`,
  };
}

export const fhenixContractNotes = {
  status:
    "This frontend uses a production-shaped adapter with mock execution so the UI runs locally without the Fhenix SDK. Replace these functions with the official wallet and contract client when wiring a live chain.",
};
