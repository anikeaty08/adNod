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

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on?: (event: string, listener: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
      isMetaMask?: boolean;
    };
  }
}

export async function connectFhenixWallet() {
  if (!window.ethereum) {
    throw new Error("No injected wallet found. Install MetaMask or another EVM wallet provider.");
  }

  const accounts = (await window.ethereum.request({
    method: "eth_requestAccounts",
  })) as string[];
  const chainId = (await window.ethereum.request({
    method: "eth_chainId",
  })) as string;

  return {
    address: accounts[0] ?? null,
    network: chainId,
    sdkReady: true,
    providerName: window.ethereum.isMetaMask ? "MetaMask" : "Injected Wallet",
  };
}

export async function createCampaignOnChain(
  input: CampaignInput,
  advertiser = "wallet-not-connected",
): Promise<ContractCampaign> {
  await wait(750);
  return {
    ...input,
    id: `CMP-${Math.floor(Math.random() * 9000 + 1000)}`,
    advertiser,
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
    "Wallet connection now uses the browser's injected provider. Campaign creation still uses a local contract-shaped adapter until the live Fhenix client methods are wired in.",
};
