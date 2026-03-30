import type { CampaignInput, ContractCampaign } from "@/lib/fhenix-contract";

export const liveStats = [
  { label: "Escrow Locked", value: "2.8M MAS", delta: "+18.4%" },
  { label: "Active Campaigns", value: "148", delta: "+12 this week" },
  { label: "Developer Nodes", value: "3,420", delta: "+9.2%" },
  { label: "Fraud Events Blocked", value: "784", delta: "-22%" },
];

export const hosterMetrics = [
  { label: "Spend today", value: "MAS 48,200", hint: "Across 12 active campaigns" },
  { label: "CTR uplift", value: "14.8%", hint: "Vs prior 7-day window" },
  { label: "Escrow available", value: "MAS 132,900", hint: "Ready for distribution" },
  { label: "Verified traffic", value: "96.1%", hint: "Post fraud screening" },
];

export const developerMetrics = [
  { label: "Earnings today", value: "MAS 3,920", hint: "Across 8 placements" },
  { label: "Fill rate", value: "87.3%", hint: "On-chain matched impressions" },
  { label: "Average eCPM", value: "MAS 12.90", hint: "Last 24h" },
  { label: "Pending payout", value: "MAS 1,180", hint: "Releases at settlement" },
];

export const performanceSeries = [
  { label: "Mon", spend: 9, clicks: 280, impressions: 22000 },
  { label: "Tue", spend: 11, clicks: 325, impressions: 24800 },
  { label: "Wed", spend: 14, clicks: 412, impressions: 28600 },
  { label: "Thu", spend: 12, clicks: 390, impressions: 27100 },
  { label: "Fri", spend: 16, clicks: 470, impressions: 31500 },
  { label: "Sat", spend: 13, clicks: 418, impressions: 29300 },
  { label: "Sun", spend: 18, clicks: 510, impressions: 34750 },
];

export const marketplaceCampaigns: ContractCampaign[] = [
  {
    id: "CMP-4021",
    advertiser: "0x7841BAd26ed91bd90eAB430B2f0533fAd1223A8d",
    title: "BlueSky Wallet Launch",
    description: "Acquire privacy-native wallet users across DeFi and gaming surfaces.",
    creativeUrl: "https://cdn.adnode.example/creative/bluesky-wallet",
    budget: 48000,
    escrowedMas: 48000,
    pricingModel: "CPC",
    rate: 3.4,
    impressions: 126000,
    clicks: 5100,
    status: "active",
  },
  {
    id: "CMP-5177",
    advertiser: "0x28A7607f4d8734Ff79c52c0eeA482A0A1Ac89d11",
    title: "Nimbus zkCloud",
    description: "Drive signups for encrypted compute infrastructure with targeted developer placements.",
    creativeUrl: "https://cdn.adnode.example/creative/nimbus-cloud",
    budget: 91000,
    escrowedMas: 72400,
    pricingModel: "CPM",
    rate: 18,
    impressions: 210000,
    clicks: 6430,
    status: "active",
  },
  {
    id: "CMP-6310",
    advertiser: "0x8A2E4BC1f9609F1Ae6B9774dCBF9023312AA2Ba2",
    title: "ChainPilot Node Suite",
    description: "Hybrid performance campaign combining awareness and node operator conversions.",
    creativeUrl: "https://cdn.adnode.example/creative/chainpilot",
    budget: 60000,
    escrowedMas: 33800,
    pricingModel: "HYBRID",
    rate: 11.5,
    impressions: 174000,
    clicks: 3890,
    status: "paused",
  },
];

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
  title: "Fhenix Mainnet Launch Wave",
  description: "Promote a privacy-native rollup launch across premium publisher inventory.",
  creativeUrl: "https://cdn.adnode.example/creative/mainnet",
  budget: 35000,
  pricingModel: "CPC",
  rate: 2.5,
};
