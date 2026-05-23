import { createPublicClient, defineChain, http } from "viem";
import { arbitrumSepolia } from "viem/chains";
import adRegistryAbi from "../lib/abi/registry-abi.json" with { type: "json" };
import { FHELIUM_CHAIN_ID, getConfiguredChainId, getDeploymentConfig } from "./runtime.js";

export type RegistryChainHealth = {
  chainId: number;
  registryConfigured: boolean;
  chainReadOk: boolean;
  blockNumber?: string;
};

const chainId = getConfiguredChainId();
const deployment = getDeploymentConfig({ allowUndeployed: true });

const adRegistryAddress = (process.env.VITE_ADREGISTRY_ADDRESS ||
  process.env.NEXT_PUBLIC_AD_REGISTRY_ADDRESS ||
  deployment.adRegistry) as `0x${string}` | undefined;
const adAnalyticsAddress = (process.env.VITE_ADANALYTICS_ADDRESS ||
  process.env.NEXT_PUBLIC_AD_ANALYTICS_ADDRESS ||
  deployment.adAnalytics) as `0x${string}` | undefined;

const rpcUrl = deployment.rpcUrl;

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
    throw new Error("AdRegistry address is not configured on the server.");
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
    args: [],
  })) as bigint;
}

export async function getNextSlotId() {
  const registryAddress = getRegistryAddress();
  return (await publicClient.readContract({
    address: registryAddress,
    abi: adRegistryAbi as any,
    functionName: "nextSlotId" as any,
    args: [],
  })) as bigint;
}

export async function getSlotPublicInfo(chainSlotId: string) {
  const registryAddress = getRegistryAddress();
  const [developer, siteName, category, active, assignedCampaignId] = (await publicClient.readContract({
    address: registryAddress,
    abi: adRegistryAbi as any,
    functionName: "slots" as any,
    args: [BigInt(chainSlotId)],
  })) as [string, string, string, boolean, bigint];

  return { developer, siteName, category, active, assignedCampaignId: assignedCampaignId.toString() };
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
        args: [],
      });
    }
    return { chainId, registryConfigured, chainReadOk: true, blockNumber: blockNumber.toString() };
  } catch {
    return { chainId, registryConfigured, chainReadOk: false };
  }
}

export { adRegistryAddress, adAnalyticsAddress, publicClient as serverPublicClient };
