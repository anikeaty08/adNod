import { useMemo } from "react";
import { useAccount, useConnect, usePublicClient, useWalletClient, useWriteContract } from "wagmi";
import { readContract } from "@wagmi/core";
import { waitForTransactionReceipt } from "viem/actions";
import { decodeEventLog, formatEther, parseEther } from "viem";
import { EncryptionTypes } from "fhenixjs-bundled";
import { wagmiConfig, adRegistryAbiTyped, adRegistryAddress, adAnalyticsAbiTyped, adAnalyticsAddress, encryptedInputToSolidity, extractPermissionForContract, getFhenixClient } from "@/lib/contract-client";
import { saveCampaignMetadata, fetchCampaignMetadata } from "@/lib/api";

export function useAdNode() {
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();
  const isConfigured = Boolean(adRegistryAddress && adAnalyticsAddress && import.meta.env.VITE_FHENIX_RPC_URL);

  const assertConfigured = () => {
    if (!isConfigured) {
      throw new Error("Fhenix contract addresses or RPC URL are missing from the environment.");
    }
  };

  return useMemo(
    () => ({
      address,
      isConnected,
      isPending,
      isConfigured,
      connectWallet: async () => {
        if (!connectors.length) throw new Error("No wallet connector available.");
        await connectAsync({ connector: connectors[0] });
      },
      createCampaign: async (params: {
        creativeURI: string;
        category: string;
        budget: string;
        cpc: number;
        title: string;
        description: string;
      }) => {
        assertConfigured();
        if (!walletClient || !publicClient || !address) {
          throw new Error("Wallet is not connected.");
        }

        const fhenix = await getFhenixClient();
        const encryptedBudget = await fhenix.encrypt_uint64(parseEther(params.budget).toString(16));
        const encryptedCpc = await fhenix.encrypt(params.cpc, EncryptionTypes.uint32);

        const hash = await writeContractAsync({
          address: adRegistryAddress,
          abi: adRegistryAbiTyped,
          functionName: "createCampaign",
          args: [
            params.creativeURI,
            params.category,
            encryptedInputToSolidity(encryptedBudget),
            encryptedInputToSolidity(encryptedCpc),
          ],
          chain: walletClient.chain,
          account: walletClient.account,
        });

        const receipt = await waitForTransactionReceipt(publicClient, { hash });
        const createdLog = receipt.logs.find((log) => log.address.toLowerCase() === adRegistryAddress.toLowerCase());

        if (!createdLog) throw new Error("CampaignCreated event not found.");

        const decoded = decodeEventLog({
          abi: adRegistryAbiTyped,
          data: createdLog.data,
          topics: createdLog.topics,
        });

        const campaignId = Number((decoded.args as { id: bigint } | undefined)?.id);

        if (!Number.isFinite(campaignId)) {
          throw new Error("Unable to decode CampaignCreated event.");
        }

        await saveCampaignMetadata({
          chainCampaignId: String(campaignId),
          title: params.title,
          description: params.description,
          creativeURI: params.creativeURI,
          category: params.category,
          advertiser: address,
        });

        return { hash, campaignId };
      },
      registerSlot: async (siteName: string, category: string) => {
        assertConfigured();
        if (!walletClient) throw new Error("Wallet is not connected.");

        return writeContractAsync({
          address: adRegistryAddress,
          abi: adRegistryAbiTyped,
          functionName: "registerSlot",
          args: [siteName, category],
          chain: walletClient.chain,
          account: walletClient.account,
        });
      },
      recordImpression: async (campaignId: number) => {
        assertConfigured();
        if (!walletClient) throw new Error("Wallet is not connected.");

        return writeContractAsync({
          address: adAnalyticsAddress,
          abi: adAnalyticsAbiTyped,
          functionName: "recordImpression",
          args: [BigInt(campaignId)],
          chain: walletClient.chain,
          account: walletClient.account,
        });
      },
      getMyStats: async (campaignId: number) => {
        assertConfigured();
        if (!address) throw new Error("Wallet is not connected.");

        const fhenix = await getFhenixClient();
        const permit = await fhenix.generatePermit(adAnalyticsAddress);
        const permission = extractPermissionForContract(permit);
        const result = (await readContract(wagmiConfig, {
          address: adAnalyticsAddress,
          abi: adAnalyticsAbiTyped,
          functionName: "getMyStats",
          args: [BigInt(campaignId), permission],
        })) as [string, string];

        return {
          impressions: Number(fhenix.unseal(adAnalyticsAddress, result[0], address)),
          clicks: Number(fhenix.unseal(adAnalyticsAddress, result[1], address)),
        };
      },
      getMyBudget: async (campaignId: number) => {
        assertConfigured();
        if (!address) throw new Error("Wallet is not connected.");

        const fhenix = await getFhenixClient();
        const permit = await fhenix.generatePermit(adRegistryAddress);
        const permission = extractPermissionForContract(permit);
        const result = (await readContract(wagmiConfig, {
          address: adRegistryAddress,
          abi: adRegistryAbiTyped,
          functionName: "getMyBudget",
          args: [BigInt(campaignId), permission],
        })) as string;

        return formatEther(fhenix.unseal(adRegistryAddress, result, address));
      },
      getMyEarnings: async () => {
        assertConfigured();
        if (!address) throw new Error("Wallet is not connected.");

        const fhenix = await getFhenixClient();
        const permit = await fhenix.generatePermit(adAnalyticsAddress);
        const permission = extractPermissionForContract(permit);
        const result = (await readContract(wagmiConfig, {
          address: adAnalyticsAddress,
          abi: adAnalyticsAbiTyped,
          functionName: "getMyEarnings",
          args: [permission],
        })) as string;

        return formatEther(fhenix.unseal(adAnalyticsAddress, result, address));
      },
      getPublicCampaigns: async () => {
        if (!isConfigured) {
          return [];
        }

        const metadata = await fetchCampaignMetadata();
        const nextId = (await readContract(wagmiConfig, {
          address: adRegistryAddress,
          abi: adRegistryAbiTyped,
          functionName: "nextCampaignId",
        })) as bigint;

        const campaigns = await Promise.all(
          Array.from({ length: Number(nextId) - 1 }, async (_, index) => {
            const id = index + 1;
            const [creativeURI, category, active] = (await readContract(wagmiConfig, {
              address: adRegistryAddress,
              abi: adRegistryAbiTyped,
              functionName: "getPublicInfo",
              args: [BigInt(id)],
            })) as [string, string, boolean];
            const metadataItem = metadata.find((item) => item.chainCampaignId === String(id));

            return {
              id: String(id),
              title: metadataItem?.title || `Campaign ${id}`,
              description: metadataItem?.description || "On-chain campaign",
              creativeURI,
              category,
              pricingModel: "CPC" as const,
              status: active ? ("active" as const) : ("paused" as const),
              advertiser: metadataItem?.advertiser || "",
            };
          }),
        );

        return campaigns;
      },
    }),
    [address, connectAsync, connectors, isConfigured, isConnected, isPending, publicClient, walletClient, writeContractAsync],
  );
}
