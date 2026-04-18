import { defineChain } from "viem";
import { arbitrumSepolia } from "viem/chains";

/** Default wallet + app target: Arbitrum Sepolia (Fhenix CoFHE dev on this rollup). */
export const adnodeChain = arbitrumSepolia;

export const ADNODE_CHAIN_ID = adnodeChain.id;

/** Optional: Fhenix Helium testnet (switch via `NEXT_PUBLIC_ADNODE_NETWORK` / `VITE_ADNODE_NETWORK`). */
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
