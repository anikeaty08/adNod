import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { defineChain, type Address, createPublicClient, createWalletClient, custom, parseEther } from "viem";
import { createCofheClient, createCofheConfig } from "@cofhe/sdk/web";
import { arbSepolia } from "@cofhe/sdk/chains";
import type { FheTypes } from "@cofhe/sdk";
import adRegistryAbi from "@/lib/abi/AdRegistry.json";
import adAnalyticsAbi from "@/lib/abi/AdAnalytics.json";

const chainId = Number(import.meta.env.VITE_CHAIN_ID || 421614);
const rpcUrl = import.meta.env.VITE_FHENIX_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc";

export const fhenixArbitrumSepolia = defineChain({
  id: chainId,
  name: "Arbitrum Sepolia",
  network: "arbitrum-sepolia",
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
  blockExplorers: {
    default: {
      name: "Arbiscan",
      url: "https://sepolia.arbiscan.io",
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

const cofheConfig = createCofheConfig({
  supportedChains: [
    {
      ...arbSepolia,
      id: chainId,
      name: "Arbitrum Sepolia",
    },
  ],
  useWorkers: false,
});

const cofheClient = createCofheClient(cofheConfig);

export async function getCofheClient() {
  if (!window.ethereum) {
    throw new Error("No injected wallet provider found.");
  }

  const publicClient = createPublicClient({
    chain: fhenixArbitrumSepolia,
    transport: http(rpcUrl),
  });
  const walletClient = createWalletClient({
    chain: fhenixArbitrumSepolia,
    transport: custom(window.ethereum),
  });

  await cofheClient.connect(publicClient, walletClient);
  return cofheClient;
}

export function encryptedInputToSolidity(value: {
  ctHash: bigint | string;
  securityZone: number;
  utype: FheTypes;
  signature: `0x${string}`;
}) {
  return {
    ctHash: typeof value.ctHash === "string" ? BigInt(value.ctHash) : value.ctHash,
    securityZone: value.securityZone,
    utype: value.utype,
    signature: value.signature,
  };
}

export function formatBudgetToChainUnits(value: string) {
  return parseEther(value);
}

export function getNetworkLabel(chainIdValue?: number | null) {
  if (chainIdValue === 421614) {
    return "Arbitrum Sepolia";
  }

  if (!chainIdValue) {
    return null;
  }

  return `Chain ${chainIdValue}`;
}

export function getIpfsGatewayUrl(uri: string) {
  if (uri.startsWith("ipfs://")) {
    return `https://gateway.pinata.cloud/ipfs/${uri.replace("ipfs://", "")}`;
  }

  return uri;
}
