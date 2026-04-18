import { createPublicClient, defineChain, http } from "viem";
import { arbitrumSepolia } from "viem/chains";
import adRegistryAbi from "../src/lib/abi/AdRegistry.json" with { type: "json" };
import { FHELIUM_CHAIN_ID, getConfiguredChainId } from "./runtime.js";

export type RegistryChainHealth = {
  chainId: number;
  registryConfigured: boolean;
  chainReadOk: boolean;
  blockNumber?: string;
};

const chainId = getConfiguredChainId();
const adRegistryAddress = process.env.VITE_ADREGISTRY_ADDRESS as `0x${string}` | undefined;
const adAnalyticsAddress = process.env.VITE_ADANALYTICS_ADDRESS as `0x${string}` | undefined;

const rpcUrl =
  process.env.VITE_FHENIX_RPC_URL ||
  process.env.ARBITRUM_SEPOLIA_RPC_URL ||
  (chainId === arbitrumSepolia.id
    ? arbitrumSepolia.rpcUrls.default.http[0]
    : "https://api.helium.fhenix.zone");

const chain =
  chainId === arbitrumSepolia.id
    ? {
        ...arbitrumSepolia,
        rpcUrls: {
          default: { http: [rpcUrl] },
          public: { http: [rpcUrl] },
        },
      }
    : defineChain({
        id: chainId,
        name: chainId === FHELIUM_CHAIN_ID ? "Fhenix Helium" : "Configured Chain",
        network: chainId === FHELIUM_CHAIN_ID ? "fhenix-helium" : "configured-chain",
        nativeCurrency: {
          name: "tFHE",
          symbol: "tFHE",
          decimals: 18,
        },
        rpcUrls: {
          default: { http: [rpcUrl] },
          public: { http: [rpcUrl] },
        },
      });

const publicClient = createPublicClient({
  chain,
  transport: http(chain.rpcUrls.default.http[0]),
});

function assertRegistryConfigured() {
  if (!adRegistryAddress) {
    throw new Error("VITE_ADREGISTRY_ADDRESS is not configured on the server.");
  }
}

function getRegistryAddress(): `0x${string}` {
  assertRegistryConfigured();
  return adRegistryAddress as `0x${string}`;
}

export async function getCampaignHoster(chainCampaignId: string) {
  const registryAddress = getRegistryAddress();
  return (await publicClient.readContract({
    address: registryAddress,
    abi: adRegistryAbi as any,
    functionName: "campaignHoster" as any,
    args: [BigInt(chainCampaignId)],
  })) as string;
}

export async function getNextCampaignId() {
  const registryAddress = getRegistryAddress();
  return (await publicClient.readContract({
    address: registryAddress,
    abi: adRegistryAbi as any,
    functionName: "nextCampaignId" as any,
  })) as bigint;
}

export async function getCampaignPublicInfo(chainCampaignId: string) {
  const registryAddress = getRegistryAddress();
  return (await publicClient.readContract({
    address: registryAddress,
    abi: adRegistryAbi as any,
    functionName: "getPublicInfo" as any,
    args: [BigInt(chainCampaignId)],
  })) as [string, string, boolean];
}

export async function getCampaignSettlementTerms(chainCampaignId: string) {
  const registryAddress = getRegistryAddress();
  return (await publicClient.readContract({
    address: registryAddress,
    abi: adRegistryAbi as any,
    functionName: "getSettlementTerms" as any,
    args: [BigInt(chainCampaignId)],
  })) as [number, bigint];
}

export async function getSlotDeveloper(chainSlotId: string) {
  const registryAddress = getRegistryAddress();
  const [developer] = (await publicClient.readContract({
    address: registryAddress,
    abi: adRegistryAbi as any,
    functionName: "slots" as any,
    args: [BigInt(chainSlotId)],
  })) as [string, string, string, boolean, bigint];

  return developer;
}

export async function getAssignedCampaignId(chainSlotId: string) {
  const registryAddress = getRegistryAddress();
  const [, , , , assignedCampaignId] = (await publicClient.readContract({
    address: registryAddress,
    abi: adRegistryAbi as any,
    functionName: "slots" as any,
    args: [BigInt(chainSlotId)],
  })) as [string, string, string, boolean, bigint];

  return assignedCampaignId.toString();
}

/** Lightweight RPC + optional registry read for `/health` and ops dashboards. */
export async function getRegistryChainHealth(): Promise<RegistryChainHealth> {
  const chainId = getConfiguredChainId();
  const registryConfigured = Boolean(adRegistryAddress);

  try {
    const blockNumber = await publicClient.getBlockNumber();
    if (registryConfigured) {
      await publicClient.readContract({
        address: adRegistryAddress as `0x${string}`,
        abi: adRegistryAbi as any,
        functionName: "nextCampaignId",
      });
    }
    return { chainId, registryConfigured, chainReadOk: true, blockNumber: blockNumber.toString() };
  } catch {
    return { chainId, registryConfigured, chainReadOk: false };
  }
}

export { adRegistryAddress, adAnalyticsAddress, publicClient as serverPublicClient };
