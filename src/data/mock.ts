import type { CampaignInput } from "@/lib/fhenix-contract";

export const tutorialCards = [
  {
    title: "Encrypted campaigns live",
    description: "Create a campaign on-chain, keep the creative public, and leave financial state encrypted under CoFHE permissions.",
    duration: "Live now",
  },
  {
    title: "Developer slots open",
    description: "Register publisher inventory on-chain and review marketplace demand while the public SDK is finalized.",
    duration: "Live now",
  },
  {
    title: "SDK rollout tracked",
    description: "The embed runtime and relay tooling are still in progress, so the docs page marks them clearly as Wave 3 work.",
    duration: "Wave 3",
  },
];

export const defaultCampaignForm: CampaignInput = {
  title: "",
  description: "",
  creativeURI: "",
  category: "",
  budget: "",
  initialFunding: "",
  pricingModel: "CPC",
  rate: "",
};
