import "dotenv/config";
import { Encryptable } from "@cofhe/sdk";
import { createCofheClient, createCofheConfig } from "@cofhe/sdk/node";
import { arbSepolia } from "@cofhe/sdk/chains";
import { privateKeyToAccount } from "viem/accounts";
import { createPublicClient, createWalletClient, defineChain, formatEther, http, keccak256, parseEther, stringToBytes } from "viem";
import { writeContract } from "viem/actions";
import adAnalyticsAbi from "../lib/abi/analytics-abi.json" with { type: "json" };
import adRegistryAbi from "../lib/abi/registry-abi.json" with { type: "json" };
import { adAnalyticsAddress, adRegistryAddress } from "./chain-state.js";
import { listPendingMeasurements } from "./measurement-store.js";
import { incrementAcceptedImpression, markSettledImpressionUnits } from "./settlement-state-store.js";
import { updateMeasurementStatus, type MeasurementRecord } from "./measurement-store.js";
import { arbitrumSepolia } from "viem/chains";
import { FHELIUM_CHAIN_ID, getConfiguredChainId } from "./runtime.js";
import { incrementMetric, logError } from "./observability.js";

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

function toSettlementId(record: MeasurementRecord, suffix = "") {
  return keccak256(
    stringToBytes(
      [
        record.chainCampaignId,
        record.chainSlotId,
        record.eventType,
        record.settlementId || record.eventKey,
        suffix,
      ].join(":"),
    ),
  );
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
  let payoutWei = record.pendingPayoutWei ? BigInt(record.pendingPayoutWei) : 0n;
  let pendingImpressionUnits = Number(record.pendingImpressionUnits ?? 0);
  const eventId = toSettlementId(record, "event");

  if (record.eventType === "impression") {
    if (!record.countedAt) {
      const counterTxHash = await writeContract(walletClient, {
        address: analyticsAddress,
        abi: adAnalyticsAbi,
        functionName: "recordImpression",
        args: [BigInt(record.chainCampaignId), eventId],
        chain,
        account,
      });
      await updateMeasurementStatus(record.eventKey, {
        status: "pending_chain",
        counterTxHash,
        countedAt: new Date(),
        lastError: "",
      });
      record = { ...record, status: "pending_chain", counterTxHash, countedAt: new Date() };
    }

    if (record.pricingModel === "CPM" && !record.meteredAt) {
      const state = await incrementAcceptedImpression(record.chainCampaignId, record.chainSlotId);
      const newlyBillableUnits = Math.floor(state.acceptedImpressions / 1000) - state.settledImpressionUnits;
      if (newlyBillableUnits > 0) {
        payoutWei = computePayoutWei(record.rate, BigInt(newlyBillableUnits));
        pendingImpressionUnits = newlyBillableUnits;
      }
      await updateMeasurementStatus(record.eventKey, {
        status: "pending_chain",
        meteredAt: new Date(),
        pendingPayoutWei: payoutWei.toString(),
        pendingImpressionUnits,
      });
      record = { ...record, meteredAt: new Date(), pendingPayoutWei: payoutWei.toString(), pendingImpressionUnits };
    }
  }

  if (record.eventType === "click") {
    if (!record.countedAt) {
      const counterTxHash = await writeContract(walletClient, {
        address: analyticsAddress,
        abi: adAnalyticsAbi,
        functionName: "recordClick",
        args: [BigInt(record.chainCampaignId), eventId],
        chain,
        account,
      });
      await updateMeasurementStatus(record.eventKey, {
        status: "pending_chain",
        counterTxHash,
        countedAt: new Date(),
        lastError: "",
      });
      record = { ...record, status: "pending_chain", counterTxHash, countedAt: new Date() };
    }

    if (record.pricingModel === "CPC") {
      payoutWei = computePayoutWei(record.rate, 1n);
      record = { ...record, pendingPayoutWei: payoutWei.toString() };
    }
  }

  if (payoutWei > 0n) {
    await assertPayoutMatchesOnChainTerms(publicClient, record, payoutWei);
    const encryptedAmount = await encryptPayoutAmount(payoutWei);
    const txHash = await writeContract(walletClient, {
      address: analyticsAddress,
      abi: adAnalyticsAbi,
      functionName: "creditDeveloperEarnings",
      args: [BigInt(record.chainCampaignId), BigInt(record.chainSlotId), payoutWei, toSettlementId(record, record.pricingModel === "CPM" ? String(payoutWei) : ""), encryptedAmount],
      chain,
      account,
    });
    if (record.eventType === "impression" && record.pricingModel === "CPM") {
      if (pendingImpressionUnits > 0) {
        await markSettledImpressionUnits(record.chainCampaignId, record.chainSlotId, pendingImpressionUnits);
      }
    }
    await updateMeasurementStatus(record.eventKey, {
      status: "settled",
      settlementTxHash: txHash,
      lastError: "",
      settledAt: new Date(),
      pendingPayoutWei: "0",
      pendingImpressionUnits: 0,
    });
    incrementMetric("settlement_success");
    return { status: "settled" as const, txHash, payoutEth: formatEther(payoutWei) };
  }

  await updateMeasurementStatus(record.eventKey, {
    status: "settled",
    settlementTxHash: "",
    lastError: "",
    settledAt: new Date(),
  });
  incrementMetric("settlement_success");
  return { status: "recorded" as const, txHash: "", payoutEth: "0" };
}

export async function markMeasurementPending(record: MeasurementRecord, error: unknown) {
  incrementMetric("settlement_failure");
  logError("settlement_pending", {
    eventKey: record.eventKey,
    error: error instanceof Error ? error.message : "Chain sync failed.",
  });
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
