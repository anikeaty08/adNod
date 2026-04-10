import { createPublicClient, defineChain, http } from "viem";
import adRegistryAbi from "../src/lib/abi/AdRegistry.json" with { type: "json" };

const rpcUrl = process.env.VITE_FHENIX_RPC_URL || process.env.ARBITRUM_SEPOLIA_RPC_URL || "";
const chainId = Number(process.env.VITE_CHAIN_ID || 421614);
const adRegistryAddress = process.env.VITE_ADREGISTRY_ADDRESS as `0x${string}` | undefined;

const chain = defineChain({
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
      http: [rpcUrl || "https://sepolia-rollup.arbitrum.io/rpc"],
    },
    public: {
      http: [rpcUrl || "https://sepolia-rollup.arbitrum.io/rpc"],
    },
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

export async function getCampaignHoster(chainCampaignId: string) {
  assertRegistryConfigured();
  return (await publicClient.readContract({
    address: adRegistryAddress,
    abi: adRegistryAbi,
    functionName: "campaignHoster",
    args: [BigInt(chainCampaignId)],
  })) as string;
}

export async function getSlotDeveloper(chainSlotId: string) {
  assertRegistryConfigured();
  const [developer] = (await publicClient.readContract({
    address: adRegistryAddress,
    abi: adRegistryAbi,
    functionName: "slots",
    args: [BigInt(chainSlotId)],
  })) as [string, string, string, boolean, bigint];

  return developer;
}

export async function getAssignedCampaignId(chainSlotId: string) {
  assertRegistryConfigured();
  const [, , , , assignedCampaignId] = (await publicClient.readContract({
    address: adRegistryAddress,
    abi: adRegistryAbi,
    functionName: "slots",
    args: [BigInt(chainSlotId)],
  })) as [string, string, string, boolean, bigint];

  return assignedCampaignId.toString();
}

export { adRegistryAddress, publicClient as serverPublicClient };
