import "dotenv/config";
import { Encryptable } from "@cofhe/sdk";
import { createCofheClient, createCofheConfig } from "@cofhe/sdk/node";
import { arbSepolia } from "@cofhe/sdk/chains";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, createWalletClient, defineChain, formatEther, http, parseEther } from "viem";
import { writeContract } from "viem/actions";
import adAnalyticsAbi from "../src/lib/abi/analytics-abi.json" with { type: "json" };
import adRegistryAbi from "../src/lib/abi/registry-abi.json" with { type: "json" };
import { adAnalyticsAddress, adRegistryAddress } from "./chain-state.js";
import { listPendingMeasurements } from "./measurement-store.js";
import { incrementAcceptedImpression, markSettledImpressionUnits } from "./settlement-state-store.js";
import { updateMeasurementStatus, type MeasurementRecord } from "./measurement-store.js";
import { arbitrumSepolia } from "viem/chains";
import { FHELIUM_CHAIN_ID, getConfiguredChainId } from "./runtime.js";

const settlementPrivateKey = process.env.SETTLEMENT_PRIVATE_KEY || process.env.PRIVATE_KEY;
const chainId = getConfiguredChainId();
const rpcUrl =
  process.env.VITE_FHENIX_RPC_URL ||
  process.env.ARBITRUM_SEPOLIA_RPC_URL ||
  (chainId === arbitrumSepolia.id
    ? arbitrumSepolia.rpcUrls.default.http[0]
    : "https://api.helium.fhenix.zone");
const UINT64_MAX = (1n << 64n) - 1n;

const chain =
  chainId === arbitrumSepolia.id
    ? {
        ...arbitrumSepolia,
        rpcUrls: { default: { http: [rpcUrl] }, public: { http: [rpcUrl] } },
      }
    : defineChain({
        id: chainId,
        name: chainId === FHELIUM_CHAIN_ID ? "Fhenix Helium" : "Configured Chain",
        network: chainId === FHELIUM_CHAIN_ID ? "fhenix-helium" : "configured-chain",
        nativeCurrency: { name: "tFHE", symbol: "tFHE", decimals: 18 },
        rpcUrls: {
          default: { http: [rpcUrl] },
          public: { http: [rpcUrl] },
        },
      });

let cofheClientPromise: ReturnType<typeof createCofheClient> | null = null;

function assertSettlementReady() {
  if (!settlementPrivateKey) {
    throw new Error("SETTLEMENT_PRIVATE_KEY or PRIVATE_KEY is required for settlement writes.");
  }
  if (!adAnalyticsAddress) {
    throw new Error("VITE_ADANALYTICS_ADDRESS is required for settlement writes.");
  }
}

function getClients() {
  assertSettlementReady();
  const account = privateKeyToAccount((settlementPrivateKey!.startsWith("0x") ? settlementPrivateKey : `0x${settlementPrivateKey}`) as `0x${string}`);
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
  const walletClient = createWalletClient({
    chain,
    account,
    transport: http(rpcUrl),
  });
  return { account, publicClient, walletClient };
}

async function getCofheNodeClient() {
  if (cofheClientPromise) {
    return cofheClientPromise;
  }

  const { publicClient, walletClient } = getClients();
  const config = createCofheConfig({
    supportedChains: [
      {
        ...arbSepolia,
        id: chainId,
      },
    ],
  });
  const client = createCofheClient(config);
  await client.connect(publicClient, walletClient);
  cofheClientPromise = client;
  return client;
}

function computePayoutWei(rate: string, billingUnits: bigint) {
  const wei = parseEther(rate) * billingUnits;
  if (wei < 0n) {
    throw new Error("Settlement payout cannot be negative.");
  }
  if (wei > UINT64_MAX) {
    throw new Error("Settlement payout exceeds uint64 encryption bound.");
  }
  return wei;
}

const MAX_CPM_UNITS_PER_SETTLEMENT = 10_000n;

async function assertPayoutMatchesOnChainTerms(
  publicClient: ReturnType<typeof createPublicClient>,
  record: MeasurementRecord,
  payoutWei: bigint,
) {
  if (payoutWei === 0n) return;
  if (!adRegistryAddress) {
    throw new Error("VITE_ADREGISTRY_ADDRESS is required to verify settlement terms.");
  }

  const [model, rateWei] = (await publicClient.readContract({
    address: adRegistryAddress,
    abi: adRegistryAbi as any,
    functionName: "getSettlementTerms" as any,
    args: [BigInt(record.chainCampaignId)],
  })) as [number, bigint];

  if (model === 0 || rateWei === 0n) {
    throw new Error("Campaign has no on-chain settlement terms; create the campaign with the updated createCampaign signature.");
  }

  if (record.pricingModel === "CPC") {
    if (model !== 1) throw new Error("On-chain settlement model is not CPC.");
    if (payoutWei !== rateWei) throw new Error(`CPC payout wei ${payoutWei} must equal on-chain rate ${rateWei}.`);
  } else if (record.pricingModel === "CPM") {
    if (model !== 2) throw new Error("On-chain settlement model is not CPM.");
    if (payoutWei % rateWei !== 0n) throw new Error("CPM payout must be a whole multiple of on-chain rate wei.");
    const units = payoutWei / rateWei;
    if (units < 1n || units > MAX_CPM_UNITS_PER_SETTLEMENT) {
      throw new Error(`CPM units ${units} out of allowed range.`);
    }
  }
}

async function encryptPayoutAmount(payoutWei: bigint) {
  const { account } = getClients();
  const client = await getCofheNodeClient();
  const [encryptedAmount] = await client
    .encryptInputs([Encryptable.uint64(payoutWei)])
    .setAccount(account.address)
    .setChainId(chainId)
    .execute();

  return {
    ctHash: typeof encryptedAmount.ctHash === "string" ? BigInt(encryptedAmount.ctHash) : encryptedAmount.ctHash,
    securityZone: encryptedAmount.securityZone,
    utype: encryptedAmount.utype,
    signature: encryptedAmount.signature,
  };
}

export async function syncMeasurementToChain(record: MeasurementRecord) {
  assertSettlementReady();
  const { account, publicClient, walletClient } = getClients();

  const analyticsAddress = adAnalyticsAddress!;
  let payoutWei = 0n;

  if (record.eventType === "impression") {
    await writeContract(walletClient, {
      address: analyticsAddress,
      abi: adAnalyticsAbi,
      functionName: "recordImpression",
      args: [BigInt(record.chainCampaignId)],
      chain,
      account,
    });

    if (record.pricingModel === "CPM") {
      const state = await incrementAcceptedImpression(record.chainCampaignId, record.chainSlotId);
      const newlyBillableUnits = Math.floor(state.acceptedImpressions / 1000) - state.settledImpressionUnits;
      if (newlyBillableUnits > 0) {
        await markSettledImpressionUnits(record.chainCampaignId, record.chainSlotId, newlyBillableUnits);
        payoutWei = computePayoutWei(record.rate, BigInt(newlyBillableUnits));
      }
    }
  }

  if (record.eventType === "click") {
    await writeContract(walletClient, {
      address: analyticsAddress,
      abi: adAnalyticsAbi,
      functionName: "recordClick",
      args: [BigInt(record.chainCampaignId)],
      chain,
      account,
    });

    if (record.pricingModel === "CPC") {
      payoutWei = computePayoutWei(record.rate, 1n);
    }
  }

  if (payoutWei > 0n) {
    await assertPayoutMatchesOnChainTerms(publicClient, record, payoutWei);
    const encryptedAmount = await encryptPayoutAmount(payoutWei);
    const txHash = await writeContract(walletClient, {
      address: analyticsAddress,
      abi: adAnalyticsAbi,
      functionName: "creditDeveloperEarnings",
      args: [BigInt(record.chainCampaignId), BigInt(record.chainSlotId), payoutWei, encryptedAmount],
      chain,
      account,
    });
    await updateMeasurementStatus(record.eventKey, {
      status: "settled",
      settlementTxHash: txHash,
      lastError: "",
      settledAt: new Date(),
    });
    return { status: "settled" as const, txHash, payoutEth: formatEther(payoutWei) };
  }

  await updateMeasurementStatus(record.eventKey, {
    status: "settled",
    settlementTxHash: "",
    lastError: "",
    settledAt: new Date(),
  });
  return { status: "recorded" as const, txHash: "", payoutEth: "0" };
}

export async function markMeasurementPending(record: MeasurementRecord, error: unknown) {
  await updateMeasurementStatus(record.eventKey, {
    status: "pending_chain",
    lastError: error instanceof Error ? error.message : "Chain sync failed.",
  });
}

export async function replayPendingMeasurements(limit = 25) {
  const pending = await listPendingMeasurements(limit);
  const results: Array<{
    eventKey: string;
    status: "settled" | "pending_chain";
    txHash?: string;
    error?: string;
  }> = [];

  for (const record of pending) {
    try {
      const settlement = await syncMeasurementToChain(record);
      results.push({
        eventKey: record.eventKey,
        status: "settled",
        txHash: settlement.txHash,
      });
    } catch (error) {
      await markMeasurementPending(record, error);
      results.push({
        eventKey: record.eventKey,
        status: "pending_chain",
        error: error instanceof Error ? error.message : "Chain sync failed.",
      });
    }
  }

  return {
    scanned: pending.length,
    settled: results.filter((item) => item.status === "settled").length,
    pending: results.filter((item) => item.status === "pending_chain").length,
    results,
  };
}
