import { createConfig, createStorage, http } from "wagmi";
import { walletConnect } from "wagmi/connectors";
import { defineChain, type Address, createPublicClient, createWalletClient, custom, parseEther, formatUnits, parseUnits, type WalletClient } from "viem";
import { createCofheClient, createCofheConfig } from "@cofhe/sdk/web";
import { arbSepolia } from "@cofhe/sdk/chains";
import type { FheTypes } from "@cofhe/sdk";
import adRegistryAbi from "@/lib/abi/AdRegistry.json";
import adAnalyticsAbi from "@/lib/abi/AdAnalytics.json";
import adNodePayoutWrapperAbi from "@/lib/abi/AdNodePayoutWrapper.json";

const chainId = Number(import.meta.env.VITE_CHAIN_ID || 421614);
const rpcUrl = import.meta.env.VITE_FHENIX_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc";
const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "";

export const fhenixArbitrumSepolia = defineChain({
  id: chainId,
  name: "Fhenix Testnet",
  network: "fhenix-testnet",
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

const connectors = [
  ...(walletConnectProjectId
    ? [
        walletConnect({
          projectId: walletConnectProjectId,
          showQrModal: true,
          metadata: {
            name: "AdNode",
            description: "Confidential ad marketplace on the Fhenix-compatible Arbitrum Sepolia testnet.",
            url: "https://adnode.app",
            icons: ["https://walletconnect.com/walletconnect-logo.png"],
          },
          qrModalOptions: {
            themeMode: "light",
          },
        }),
      ]
    : []),
] as const;

export const wagmiConfig = createConfig({
  chains: [fhenixArbitrumSepolia],
  connectors,
  transports: {
    [fhenixArbitrumSepolia.id]: http(rpcUrl),
  },
  storage: createStorage({
    storage: window.localStorage,
  }),
});

export const adRegistryAddress = import.meta.env.VITE_ADREGISTRY_ADDRESS ? (import.meta.env.VITE_ADREGISTRY_ADDRESS as Address) : undefined;
export const adAnalyticsAddress = import.meta.env.VITE_ADANALYTICS_ADDRESS ? (import.meta.env.VITE_ADANALYTICS_ADDRESS as Address) : undefined;

export const adRegistryAbiTyped = adRegistryAbi;
export const adAnalyticsAbiTyped = adAnalyticsAbi;
export const adNodePayoutWrapperAbiTyped = adNodePayoutWrapperAbi;

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

export async function getCofheClient(activeWalletClient?: WalletClient) {
  const publicClient = createPublicClient({
    chain: fhenixArbitrumSepolia,
    transport: http(rpcUrl),
  });
  const walletClient =
    activeWalletClient ??
    (() => {
      if (!window.ethereum) {
        throw new Error("No active WalletConnect session found. Connect with WalletConnect first.");
      }

      return createWalletClient({
        chain: fhenixArbitrumSepolia,
        transport: custom(window.ethereum),
      });
    })();

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

export function parseRateToMicrounits(value: string) {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error("Campaign rate is required.");
  }

  const [whole = "0", fractional = ""] = normalized.split(".");
  const fractionalPadded = `${fractional}000000`.slice(0, 6);
  const microunits = BigInt(whole) * 1_000_000n + BigInt(fractionalPadded);

  if (microunits <= 0n || microunits > 4_294_967_295n) {
    throw new Error("Campaign rate must fit within the supported encrypted pricing range.");
  }

  return Number(microunits);
}

export function formatPayoutTokenUnits(value: bigint) {
  return formatUnits(value, 6);
}

export function parsePayoutTokenUnits(value: string) {
  return parseUnits(value, 6);
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

export function isWalletConnectEnabled() {
  return Boolean(walletConnectProjectId);
}
