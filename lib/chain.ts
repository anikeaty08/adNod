import { defineChain } from "viem";
import { arbitrumSepolia } from "viem/chains";

export const fhenixHelium = defineChain({
  id: 8008135,
  name: "Fhenix Helium",
  nativeCurrency: {
    name: "tFHE",
    symbol: "tFHE",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://api.helium.fhenix.zone"],
    },
  },
  blockExplorers: {
    default: {
      name: "Fhenix Explorer",
      url: "https://explorer.helium.fhenix.zone",
    },
  },
});

export const supportedAdNodeChains = [arbitrumSepolia, fhenixHelium] as const;

export type AdNodeNetworkKey = "fhenixArbitrumSepolia" | "fhenixHelium";

export function getSelectedNetworkKey(): AdNodeNetworkKey {
  const raw = process.env.NEXT_PUBLIC_ADNODE_NETWORK || process.env.VITE_ADNODE_NETWORK || "fhenixArbitrumSepolia";
  if (raw === "fhenixHelium") return raw;
  return "fhenixArbitrumSepolia";
}

/** Selected wallet + app target. Arbitrum Sepolia and Fhenix Helium are both first-class networks. */
export const adnodeChain = getSelectedNetworkKey() === "fhenixHelium" ? fhenixHelium : arbitrumSepolia;

export const ADNODE_CHAIN_ID = adnodeChain.id;
export const ADNODE_NETWORK_NAME = adnodeChain.name;
