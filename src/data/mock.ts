import type { CampaignInput } from "@/lib/fhenix-contract";

export const tutorialCards = [
  {
    title: "Launch your first encrypted campaign",
    description: "Walk through wallet connection, escrow funding, and privacy-aware reporting.",
    duration: "7 min",
  },
  {
    title: "Publish an ad slot in React, Next.js, or Vue",
    description: "Embed AdNode widgets with framework-safe snippets and event signing.",
    duration: "11 min",
  },
  {
    title: "Fraud-resistant click attestations",
    description: "Design signed impression and click relays that settle into escrow safely.",
    duration: "9 min",
  },
];

export const defaultCampaignForm: CampaignInput = {
  title: "",
  description: "",
  creativeUrl: "",
  budget: 0,
  pricingModel: "CPC",
  rate: 0,
};
