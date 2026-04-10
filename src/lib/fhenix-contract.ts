export type PricingModel = "CPC" | "CPM";

export interface CampaignInput {
  title: string;
  description: string;
  creativeURI: string;
  category: string;
  budget: string;
  initialFunding: string;
  pricingModel: PricingModel;
  rate: string;
}

export interface ContractCampaign {
  id: string;
  title: string;
  description: string;
  creativeURI: string;
  category: string;
  advertiser: string;
  pricingModel: PricingModel;
  rate?: string | null;
  status: "active" | "paused";
  encryptedBudget?: string | null;
  encryptedCpc?: string | null;
  impressions?: number | null;
  clicks?: number | null;
  availableEscrowEth?: string | null;
  totalFundedEth?: string | null;
  totalSettledEth?: string | null;
}

export interface SlotMetadata {
  chainSlotId: string;
  siteName: string;
  siteUrl: string;
  category: string;
  dailyTrafficEstimate: string;
  developer: string;
  assignedCampaignId: string;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}
