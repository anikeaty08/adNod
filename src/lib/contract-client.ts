import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { defineChain, type Address, type Hex, toHex } from "viem";
import { FhenixClientSync, type Permit } from "fhenixjs-bundled";
import adRegistryAbi from "@/lib/abi/AdRegistry.json";
import adAnalyticsAbi from "@/lib/abi/AdAnalytics.json";

const chainId = Number(import.meta.env.VITE_CHAIN_ID || 421614);
const rpcUrl = import.meta.env.VITE_FHENIX_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc";

export const fhenixArbitrumSepolia = defineChain({
  id: chainId,
  name: "Fhenix Arbitrum Sepolia",
  network: "fhenix-arbitrum-sepolia",
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [rpcUrl],
    },
    public: {
      http: [rpcUrl],
    },
  },
});

export const wagmiConfig = createConfig({
  chains: [fhenixArbitrumSepolia],
  connectors: [injected()],
  transports: {
    [fhenixArbitrumSepolia.id]: http(rpcUrl),
  },
});

export const adRegistryAddress = (import.meta.env.VITE_ADREGISTRY_ADDRESS || "") as Address;
export const adAnalyticsAddress = (import.meta.env.VITE_ADANALYTICS_ADDRESS || "") as Address;

export const adRegistryAbiTyped = adRegistryAbi;
export const adAnalyticsAbiTyped = adAnalyticsAbi;

let clientPromise: Promise<FhenixClientSync> | null = null;

export async function getFhenixClient() {
  if (!window.ethereum) {
    throw new Error("No injected wallet provider found.");
  }

  if (!clientPromise) {
    clientPromise = FhenixClientSync.create({
      provider: window.ethereum,
      securityZones: [0],
    });
  }

  return clientPromise;
}

export function encryptedInputToSolidity(value: { data: Uint8Array; securityZone: number }) {
  return {
    data: toHex(value.data) as Hex,
    securityZone: value.securityZone,
  };
}

export function extractPermissionForContract(permit: Permit) {
  return {
    publicKey: permit.publicKey as Hex,
    signature: permit.signature as Hex,
  };
}

export function getIpfsGatewayUrl(uri: string) {
  if (uri.startsWith("ipfs://")) {
    return `https://gateway.pinata.cloud/ipfs/${uri.replace("ipfs://", "")}`;
  }

  return uri;
}
