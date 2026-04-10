import { useMemo } from "react";
import { Encryptable, FheTypes } from "@cofhe/sdk";
import { useAccount, useConnect, usePublicClient, useWalletClient, useWriteContract } from "wagmi";
import { readContract } from "@wagmi/core";
import { waitForTransactionReceipt } from "viem/actions";
import { decodeEventLog, formatEther, formatUnits, parseUnits, type Address } from "viem";
import {
  wagmiConfig,
  adRegistryAbiTyped,
  adRegistryAddress,
  adAnalyticsAbiTyped,
  adAnalyticsAddress,
  adNodePayoutWrapperAbiTyped,
  encryptedInputToSolidity,
  formatBudgetToChainUnits,
  formatPayoutTokenUnits,
  getCofheClient,
  parseRateToMicrounits,
} from "@/lib/contract-client";
import { saveCampaignMetadata, fetchCampaignMetadata, fetchSlots, saveSlot, updateSlotAssignment } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

export function useAdNode() {
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { writeContractAsync, isPending } = useWriteContract();
  const isConfigured = Boolean(adRegistryAddress && adAnalyticsAddress);

  const assertConfigured = () => {
    if (!isConfigured || !adRegistryAddress || !adAnalyticsAddress) {
      throw new Error("Fhenix contract addresses are missing from the environment. Deploy the contracts and set VITE_ADREGISTRY_ADDRESS and VITE_ADANALYTICS_ADDRESS.");
    }
  };

  const assertRegistryConfigured = () => {
    if (!adRegistryAddress) {
      throw new Error("AdRegistry is not configured yet.");
    }
  };

  const getRegistryAddress = (): Address => {
    assertRegistryConfigured();
    return adRegistryAddress as Address;
  };

  const getAnalyticsAddress = (): Address => {
    assertConfigured();
    return adAnalyticsAddress as Address;
  };

  const toReadableDecryptError = (error: unknown, ownerMessage: string) => {
    const message = error instanceof Error ? error.message : String(error);
    const normalized = message.toLowerCase();

    if (normalized.includes("not campaign owner") || normalized.includes("execution reverted")) {
      return new Error(ownerMessage);
    }

    if (normalized.includes("user rejected") || normalized.includes("rejected")) {
      return new Error("Decrypt cancelled - wallet signature was not approved.");
    }

    if (normalized.includes("permit")) {
      return new Error("Decrypt failed - wallet permit could not be created.");
    }

    return new Error("Decrypt failed - please retry with the connected owner wallet.");
  };

  return useMemo(
    () => ({
      address,
      isConnected,
      isPending,
      isConfigured,
      connectWallet: async () => {
        if (!connectors.length) throw new Error("WalletConnect is not configured.");
        await connectAsync({ connector: connectors[0] });
      },
      createCampaign: async (params: {
        creativeURI: string;
        category: string;
        budget: string;
        initialFunding: string;
        cpc: string;
        title: string;
        description: string;
        pricingModel?: "CPC" | "CPM";
      }) => {
        assertConfigured();
        if (!walletClient || !publicClient || !address) {
          throw new Error("Wallet is not connected.");
        }

        const initialFunding = formatBudgetToChainUnits(params.initialFunding);
        const registryAddress = getRegistryAddress();
        if (initialFunding <= 0n) {
          throw new Error("Initial funding must be greater than zero.");
        }

        const cofheClient = await getCofheClient(walletClient);
        const [encryptedBudget, encryptedCpc] = await cofheClient
          .encryptInputs([Encryptable.uint64(formatBudgetToChainUnits(params.budget)), Encryptable.uint32(BigInt(parseRateToMicrounits(params.cpc)))])
          .setAccount(address)
          .setChainId(walletClient.chain.id)
          .execute();

        const hash = await writeContractAsync({
          address: registryAddress,
          abi: adRegistryAbiTyped,
          functionName: "createCampaign",
          args: [
            params.creativeURI,
            params.category,
            encryptedInputToSolidity(encryptedBudget as Parameters<typeof encryptedInputToSolidity>[0]),
            encryptedInputToSolidity(encryptedCpc as Parameters<typeof encryptedInputToSolidity>[0]),
          ],
          value: initialFunding,
          chain: walletClient.chain,
          account: walletClient.account,
        });

        const receipt = await waitForTransactionReceipt(publicClient, { hash });
        const createdLog = receipt.logs.find((log) => log.address.toLowerCase() === registryAddress.toLowerCase());

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

        let metadataSaved = true;
        try {
          await saveCampaignMetadata(
            {
              chainCampaignId: String(campaignId),
              title: params.title,
              description: params.description,
              creativeURI: params.creativeURI,
              category: params.category,
              pricingModel: params.pricingModel ?? "CPC",
              rate: params.cpc,
              advertiser: address,
            },
            {
              address,
              walletClient,
            },
          );
        } catch {
          metadataSaved = false;
        }

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
          queryClient.invalidateQueries({ queryKey: ["platform-stats"] }),
        ]);

        return { hash, campaignId, metadataSaved };
      },
      fundCampaign: async (campaignId: number, amount: string) => {
        assertRegistryConfigured();
        if (!walletClient || !publicClient) throw new Error("Wallet is not connected.");
        const registryAddress = getRegistryAddress();

        const fundingAmount = formatBudgetToChainUnits(amount);
        if (fundingAmount <= 0n) {
          throw new Error("Funding amount must be greater than zero.");
        }

        const hash = await writeContractAsync({
          address: registryAddress,
          abi: adRegistryAbiTyped,
          functionName: "fundCampaign",
          args: [BigInt(campaignId)],
          value: fundingAmount,
          chain: walletClient.chain,
          account: walletClient.account,
        });

        await waitForTransactionReceipt(publicClient, { hash });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
          queryClient.invalidateQueries({ queryKey: ["platform-stats"] }),
        ]);

        return hash;
      },
      registerSlot: async (siteName: string, category: string) => {
        assertRegistryConfigured();
        if (!walletClient || !address || !publicClient) throw new Error("Wallet is not connected.");
        const registryAddress = getRegistryAddress();

        const hash = await writeContractAsync({
          address: registryAddress,
          abi: adRegistryAbiTyped,
          functionName: "registerSlot",
          args: [siteName, category],
          chain: walletClient.chain,
          account: walletClient.account,
        });

        const receipt = await waitForTransactionReceipt(publicClient, { hash });
        const slotRegisteredLog = receipt.logs.find((log) => log.address.toLowerCase() === registryAddress.toLowerCase());

        if (!slotRegisteredLog) {
          throw new Error("SlotRegistered event not found.");
        }

        const decoded = decodeEventLog({
          abi: adRegistryAbiTyped,
          data: slotRegisteredLog.data,
          topics: slotRegisteredLog.topics,
        });

        const slotId = Number((decoded.args as { id: bigint } | undefined)?.id);

        return { hash, slotId };
      },
      saveSlotMetadata: async (params: {
        chainSlotId: string;
        siteName: string;
        siteUrl: string;
        category: string;
        dailyTrafficEstimate: string;
      }) => {
        if (!address || !walletClient) throw new Error("Wallet is not connected.");

        const slot = await saveSlot(
          {
            chainSlotId: params.chainSlotId,
            siteName: params.siteName,
            siteUrl: params.siteUrl,
            category: params.category,
            dailyTrafficEstimate: params.dailyTrafficEstimate,
            developer: address,
            assignedCampaignId: "",
          },
          {
            address,
            walletClient,
          },
        );

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["slots"] }),
          queryClient.invalidateQueries({ queryKey: ["platform-stats"] }),
        ]);

        return slot;
      },
      assignCampaignToSlot: async (slotId: number, campaignId: number) => {
        assertRegistryConfigured();
        if (!walletClient || !publicClient || !address) throw new Error("Wallet is not connected.");
        const registryAddress = getRegistryAddress();

        const hash = await writeContractAsync({
          address: registryAddress,
          abi: adRegistryAbiTyped,
          functionName: "assignCampaignToSlot",
          args: [BigInt(slotId), BigInt(campaignId)],
          chain: walletClient.chain,
          account: walletClient.account,
        });

        await waitForTransactionReceipt(publicClient, { hash });

        try {
          await updateSlotAssignment(
            String(slotId),
            String(campaignId),
            {
              address,
              walletClient,
            },
          );
        } catch {
          // Chain state remains authoritative even if metadata sync fails.
        }

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["slots"] }),
          queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
          queryClient.invalidateQueries({ queryKey: ["platform-stats"] }),
        ]);

        return hash;
      },
      recordImpression: async (campaignId: number) => {
        assertConfigured();
        if (!walletClient) throw new Error("Wallet is not connected.");
        const analyticsAddress = getAnalyticsAddress();

        return writeContractAsync({
          address: analyticsAddress,
          abi: adAnalyticsAbiTyped,
          functionName: "recordImpression",
          args: [BigInt(campaignId)],
          chain: walletClient.chain,
          account: walletClient.account,
        });
      },
      getMyStats: async (campaignId: number) => {
        assertConfigured();
        if (!address || !walletClient) throw new Error("Wallet is not connected.");
        const analyticsAddress = getAnalyticsAddress();

        const cofheClient = await getCofheClient(walletClient);
        try {
          const result = (await readContract(wagmiConfig, {
            address: analyticsAddress,
            abi: adAnalyticsAbiTyped,
            functionName: "getMyStats",
            args: [BigInt(campaignId)],
          })) as [bigint, bigint];
          const permit = await cofheClient.permits.getOrCreateSelfPermit(walletClient.chain.id, address);

          return {
            impressions: Number(
              await cofheClient
                .decryptForView(result[0], FheTypes.Uint32)
                .setAccount(address)
                .setChainId(walletClient.chain.id)
                .withPermit(permit)
                .execute(),
            ),
            clicks: Number(
              await cofheClient
                .decryptForView(result[1], FheTypes.Uint32)
                .setAccount(address)
                .setChainId(walletClient.chain.id)
                .withPermit(permit)
                .execute(),
            ),
          };
        } catch (error) {
          throw toReadableDecryptError(error, "Decrypt failed - check you are the campaign owner");
        }
      },
      getMyBudget: async (campaignId: number) => {
        assertConfigured();
        if (!address || !walletClient) throw new Error("Wallet is not connected.");
        const registryAddress = getRegistryAddress();

        const cofheClient = await getCofheClient(walletClient);
        try {
          const result = (await readContract(wagmiConfig, {
            address: registryAddress,
            abi: adRegistryAbiTyped,
            functionName: "getMyBudget",
            args: [BigInt(campaignId)],
          })) as bigint;
          const permit = await cofheClient.permits.getOrCreateSelfPermit(walletClient.chain.id, address);

          return formatEther(
            await cofheClient
              .decryptForView(result, FheTypes.Uint64)
              .setAccount(address)
              .setChainId(walletClient.chain.id)
              .withPermit(permit)
              .execute(),
          );
        } catch (error) {
          throw toReadableDecryptError(error, "Decrypt failed - check you are the campaign owner");
        }
      },
      getMyEarnings: async () => {
        assertConfigured();
        if (!address || !walletClient) throw new Error("Wallet is not connected.");
        const analyticsAddress = getAnalyticsAddress();

        const cofheClient = await getCofheClient(walletClient);
        try {
          const result = (await readContract(wagmiConfig, {
            address: analyticsAddress,
            abi: adAnalyticsAbiTyped,
            functionName: "getMyEarnings",
          })) as bigint;
          const permit = await cofheClient.permits.getOrCreateSelfPermit(walletClient.chain.id, address);

          return formatEther(
            await cofheClient
              .decryptForView(result, FheTypes.Uint64)
              .setAccount(address)
              .setChainId(walletClient.chain.id)
              .withPermit(permit)
              .execute(),
          );
        } catch (error) {
          throw toReadableDecryptError(error, "Decrypt failed - check you are using the correct developer wallet");
        }
      },
      getMyClaimableEarnings: async () => {
        assertRegistryConfigured();
        if (!address) throw new Error("Wallet is not connected.");
        const registryAddress = getRegistryAddress();

        const result = (await readContract(wagmiConfig, {
          address: registryAddress,
          abi: adRegistryAbiTyped,
          functionName: "claimableEarnings",
          args: [address],
        })) as bigint;

        return formatEther(result);
      },
      claimMyEarnings: async () => {
        assertRegistryConfigured();
        if (!walletClient || !publicClient) throw new Error("Wallet is not connected.");
        const registryAddress = getRegistryAddress();

        const hash = await writeContractAsync({
          address: registryAddress,
          abi: adRegistryAbiTyped,
          functionName: "claimMyEarnings",
          args: [],
          chain: walletClient.chain,
          account: walletClient.account,
        });

        await waitForTransactionReceipt(publicClient, { hash });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
          queryClient.invalidateQueries({ queryKey: ["platform-stats"] }),
        ]);

        return hash;
      },
      getPayoutWrapperAddress: async () => {
        assertRegistryConfigured();
        const registryAddress = getRegistryAddress();

        return (await readContract(wagmiConfig, {
          address: registryAddress,
          abi: adRegistryAbiTyped,
          functionName: "getPayoutWrapper",
        })) as Address;
      },
      getMyShieldedPayoutBalance: async () => {
        assertRegistryConfigured();
        if (!address || !walletClient) throw new Error("Wallet is not connected.");

        const wrapperAddress = await (async () => {
          const registryAddress = getRegistryAddress();
          return (await readContract(wagmiConfig, {
            address: registryAddress,
            abi: adRegistryAbiTyped,
            functionName: "getPayoutWrapper",
          })) as Address;
        })();

        const cofheClient = await getCofheClient(walletClient);
        try {
          const result = (await readContract(wagmiConfig, {
            address: wrapperAddress,
            abi: adNodePayoutWrapperAbiTyped,
            functionName: "confidentialBalanceOf",
            args: [address],
          })) as bigint;
          const permit = await cofheClient.permits.getOrCreateSelfPermit(walletClient.chain.id, address);
          const clear = (await cofheClient
            .decryptForView(result, FheTypes.Uint64)
            .setAccount(address)
            .setChainId(walletClient.chain.id)
            .withPermit(permit)
            .execute()) as bigint;

          return formatPayoutTokenUnits(clear);
        } catch (error) {
          throw toReadableDecryptError(error, "Decrypt failed - check you are using the correct payout wallet");
        }
      },
      beginUnshieldPayout: async (amount: string) => {
        assertRegistryConfigured();
        if (!walletClient || !publicClient || !address) throw new Error("Wallet is not connected.");

        const wrapperAddress = (await readContract(wagmiConfig, {
          address: getRegistryAddress(),
          abi: adRegistryAbiTyped,
          functionName: "getPayoutWrapper",
        })) as Address;

        const wrapperAmount = parseUnits(amount, 6);
        if (wrapperAmount <= 0n) {
          throw new Error("Unshield amount must be greater than zero.");
        }

        const hash = await writeContractAsync({
          address: wrapperAddress,
          abi: adNodePayoutWrapperAbiTyped,
          functionName: "unshield",
          args: [walletClient.account.address, walletClient.account.address, wrapperAmount],
          chain: walletClient.chain,
          account: walletClient.account,
        });

        await waitForTransactionReceipt(publicClient, { hash });
        return hash;
      },
      getMyUnshieldClaims: async () => {
        assertRegistryConfigured();
        if (!address) throw new Error("Wallet is not connected.");

        const wrapperAddress = (await readContract(wagmiConfig, {
          address: getRegistryAddress(),
          abi: adRegistryAbiTyped,
          functionName: "getPayoutWrapper",
        })) as Address;

        const claims = (await readContract(wagmiConfig, {
          address: wrapperAddress,
          abi: adNodePayoutWrapperAbiTyped,
          functionName: "getUserClaims",
          args: [address],
        })) as Array<{
          to: Address;
          ctHash: `0x${string}`;
          requestedAmount: bigint;
          decryptedAmount: bigint;
          claimed: boolean;
        }>;

        return claims.map((claim) => ({
          ...claim,
          requestedAmountFormatted: formatUnits(claim.requestedAmount, 6),
          decryptedAmountFormatted: formatUnits(claim.decryptedAmount, 6),
        }));
      },
      completeUnshieldClaim: async (ctHash: `0x${string}`) => {
        assertRegistryConfigured();
        if (!address || !walletClient || !publicClient) throw new Error("Wallet is not connected.");

        const wrapperAddress = (await readContract(wagmiConfig, {
          address: getRegistryAddress(),
          abi: adRegistryAbiTyped,
          functionName: "getPayoutWrapper",
        })) as Address;

        const cofheClient = await getCofheClient(walletClient);
        const decryptResult = await cofheClient.decryptForTx(ctHash).setAccount(address).setChainId(walletClient.chain.id).withoutPermit().execute();

        const hash = await writeContractAsync({
          address: wrapperAddress,
          abi: adNodePayoutWrapperAbiTyped,
          functionName: "claimUnshielded",
          args: [decryptResult.ctHash as `0x${string}`, decryptResult.decryptedValue, decryptResult.signature],
          chain: walletClient.chain,
          account: walletClient.account,
        });

        await waitForTransactionReceipt(publicClient, { hash });
        return hash;
      },
      setCampaignActive: async (campaignId: number, active: boolean) => {
        assertRegistryConfigured();
        if (!walletClient || !publicClient) throw new Error("Wallet is not connected.");
        const registryAddress = getRegistryAddress();

        const hash = await writeContractAsync({
          address: registryAddress,
          abi: adRegistryAbiTyped,
          functionName: "setCampaignActive",
          args: [BigInt(campaignId), active],
          chain: walletClient.chain,
          account: walletClient.account,
        });

        await waitForTransactionReceipt(publicClient, { hash });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["campaigns"] }),
          queryClient.invalidateQueries({ queryKey: ["platform-stats"] }),
        ]);

        return hash;
      },
      getPublicCampaigns: async () => {
        const metadata = await fetchCampaignMetadata().catch(() => []);

        if (!adRegistryAddress) {
          return metadata.map((item) => ({
            id: item.chainCampaignId,
            title: item.title || `Campaign ${item.chainCampaignId}`,
              description: item.description || "Campaign metadata pending on-chain sync",
              creativeURI: item.creativeURI,
              category: item.category,
              pricingModel: item.pricingModel,
              rate: item.rate,
              status: "paused" as const,
              advertiser: item.advertiser,
            availableEscrowEth: null,
            totalFundedEth: null,
            totalSettledEth: null,
          }));
        }

        const registryAddress = getRegistryAddress();

        const nextId = (await readContract(wagmiConfig, {
          address: registryAddress,
          abi: adRegistryAbiTyped,
          functionName: "nextCampaignId",
        })) as bigint;

        const campaigns = await Promise.all(
          Array.from({ length: Number(nextId) - 1 }, async (_, index) => {
            const id = index + 1;
            const [creativeURI, category, active] = (await readContract(wagmiConfig, {
              address: registryAddress,
              abi: adRegistryAbiTyped,
              functionName: "getPublicInfo",
              args: [BigInt(id)],
            })) as [string, string, boolean];
            const advertiser = (await readContract(wagmiConfig, {
              address: registryAddress,
              abi: adRegistryAbiTyped,
              functionName: "campaignHoster",
              args: [BigInt(id)],
            })) as string;
            const [availableFunds, totalFunded, totalSettled] = (await readContract(wagmiConfig, {
              address: registryAddress,
              abi: adRegistryAbiTyped,
              functionName: "getCampaignFunding",
              args: [BigInt(id)],
            })) as [bigint, bigint, bigint];
            const metadataItem = metadata.find((item) => item.chainCampaignId === String(id));

            return {
              id: String(id),
              title: metadataItem?.title || `Campaign ${id}`,
              description: metadataItem?.description || "On-chain campaign",
              creativeURI,
              category,
              pricingModel: metadataItem?.pricingModel || ("CPC" as const),
              rate: metadataItem?.rate || null,
              status: active ? ("active" as const) : ("paused" as const),
              advertiser,
              availableEscrowEth: formatEther(availableFunds),
              totalFundedEth: formatEther(totalFunded),
              totalSettledEth: formatEther(totalSettled),
            };
          }),
        );

        return campaigns;
      },
      getPublicSlots: async () => {
        const metadata = await fetchSlots().catch(() => []);

        if (!adRegistryAddress) {
          return metadata;
        }

        const registryAddress = getRegistryAddress();

        const nextSlotId = (await readContract(wagmiConfig, {
          address: registryAddress,
          abi: adRegistryAbiTyped,
          functionName: "nextSlotId",
        })) as bigint;

        const slots = await Promise.all(
          Array.from({ length: Number(nextSlotId) - 1 }, async (_, index) => {
            const id = index + 1;
            const [developer, siteName, category, active, assignedCampaignId] = (await readContract(wagmiConfig, {
              address: registryAddress,
              abi: adRegistryAbiTyped,
              functionName: "slots",
              args: [BigInt(id)],
            })) as [string, string, string, boolean, bigint];
            const metadataItem = metadata.find((item) => item.chainSlotId === String(id));

            return {
              chainSlotId: String(id),
              siteName: metadataItem?.siteName || siteName,
              siteUrl: metadataItem?.siteUrl || "",
              category: metadataItem?.category || category,
              dailyTrafficEstimate: metadataItem?.dailyTrafficEstimate || "",
              developer,
              assignedCampaignId: assignedCampaignId > 0n ? String(assignedCampaignId) : metadataItem?.assignedCampaignId || "",
              active,
            };
          }),
        );

        return slots;
      },
      getPlatformStats: async () => {
        const [metadata, slots] = await Promise.all([fetchCampaignMetadata().catch(() => []), fetchSlots().catch(() => [])]);

        if (!adRegistryAddress) {
          return {
            totalCampaigns: metadata.length,
            totalSlots: slots.length,
            totalVerifiedTransactions: 0,
          };
        }

        const registryAddress = getRegistryAddress();

        const nextCampaignId = (await readContract(wagmiConfig, {
          address: registryAddress,
          abi: adRegistryAbiTyped,
          functionName: "nextCampaignId",
        })) as bigint;
        const nextSlotId = (await readContract(wagmiConfig, {
          address: registryAddress,
          abi: adRegistryAbiTyped,
          functionName: "nextSlotId",
        })) as bigint;

        return {
          totalCampaigns: Math.max(metadata.length, Number(nextCampaignId) - 1),
          totalSlots: Math.max(slots.length, Number(nextSlotId) - 1),
          totalVerifiedTransactions: Math.max(0, Number(nextCampaignId) - 1) + Math.max(0, Number(nextSlotId) - 1),
        };
      },
    }),
    [address, connectAsync, connectors, isConfigured, isConnected, isPending, publicClient, walletClient, writeContractAsync],
  );
}
