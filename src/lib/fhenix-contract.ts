export type PricingModel = "CPC" | "CPM";

export interface CampaignInput {
  title: string;
  description: string;
  creativeURI: string;
  category: string;
  budget: string;
  pricingModel: PricingModel;
  rate: number;
}

export interface ContractCampaign {
  id: string;
  title: string;
  description: string;
  creativeURI: string;
  category: string;
  advertiser: string;
  pricingModel: PricingModel;
  status: "active" | "paused";
  encryptedBudget?: string | null;
  encryptedCpc?: string | null;
  impressions?: number | null;
  clicks?: number | null;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}
