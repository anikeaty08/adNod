import "dotenv/config";

import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  keccak256,
  parseEther,
  stringToBytes,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { waitForTransactionReceipt } from "viem/actions";
import { arbitrumSepolia } from "viem/chains";
import adAnalyticsAbi from "../lib/abi/analytics-abi.json" with { type: "json" };
import adRegistryAbi from "../lib/abi/registry-abi.json" with { type: "json" };

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing env var ${name}`);
  return value;
}

function optionalAddress(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value as Address;
  }
  return undefined;
}

function normalizePrivateKey(value: string) {
  return (value.startsWith("0x") ? value : `0x${value}`) as `0x${string}`;
}

function txUrl(hash: string) {
  return `https://sepolia.arbiscan.io/tx/${hash}`;
}

function smokeSettlementId(input: {
  chainCampaignId: string;
  chainSlotId: string;
  eventType: "click" | "impression";
  settlementId: string;
  suffix?: string;
}) {
  return keccak256(
    stringToBytes(
      [
        input.chainCampaignId,
        input.chainSlotId,
        input.eventType,
        input.settlementId,
        input.suffix ?? "",
      ].join(":"),
    ),
  );
}

let nextTxNonce: number | undefined;

async function waitFor(publicClient: ReturnType<typeof createPublicClient>, hash: `0x${string}`, label: string) {
  const receipt = await withTimeout(waitForTransactionReceipt(publicClient, { hash }), `${label} receipt`, 180_000);
  if (receipt.status !== "success") {
    throw new Error(`${label} failed: ${hash}`);
  }
  console.log(`${label}: ${hash}`);
  console.log(`  ${txUrl(hash)}`);
}

async function withTimeout<T>(promise: Promise<T>, label: string, timeoutMs = 120_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function writeTx(
  walletClient: ReturnType<typeof createWalletClient>,
  params: any,
  label: string,
) {
  console.log(`${label}: submitting...`);
  const txParams = nextTxNonce === undefined ? params : { ...params, nonce: nextTxNonce++ };
  return await withTimeout(walletClient.writeContract(txParams), `${label} submit`, 120_000);
}

async function main() {
  console.log("Starting AdNode live marketplace smoke test...");
  console.log("Loading backend smoke dependencies...");
  const [
    { createCampaign },
    { createSlot, assignSlotCampaign },
    {
      buildMeasurementEventKey,
      buildMeasurementFingerprint,
      consumeMeasurementNonce,
      createMeasurementNonce,
      createMeasurementToken,
      hashPageUrl,
      verifyMeasurementToken,
    },
    { evaluateMeasurementPolicy },
    { recordMeasurement },
  ] = await withTimeout(
    Promise.all([
      import("../server/campaign-store.js"),
      import("../server/slot-store.js"),
      import("../server/measurement.js"),
      import("../server/measurement-policy.js"),
      import("../server/measurement-store.js"),
    ]),
    "backend dependency imports",
    60_000,
  );

  const privateKey = normalizePrivateKey(required("PRIVATE_KEY"));
  process.env.SETTLEMENT_PRIVATE_KEY = normalizePrivateKey(process.env.ADNODE_SMOKE_SETTLEMENT_PRIVATE_KEY || process.env.PRIVATE_KEY || required("PRIVATE_KEY"));

  const registryAddress = optionalAddress("NEXT_PUBLIC_AD_REGISTRY_ADDRESS", "VITE_ADREGISTRY_ADDRESS");
  const analyticsAddress = optionalAddress("NEXT_PUBLIC_AD_ANALYTICS_ADDRESS", "VITE_ADANALYTICS_ADDRESS");
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || process.env.VITE_FHENIX_RPC_URL || process.env.ARBITRUM_SEPOLIA_RPC_URL;
  if (!registryAddress) throw new Error("Missing NEXT_PUBLIC_AD_REGISTRY_ADDRESS or VITE_ADREGISTRY_ADDRESS");
  if (!analyticsAddress) throw new Error("Missing NEXT_PUBLIC_AD_ANALYTICS_ADDRESS or VITE_ADANALYTICS_ADDRESS");
  if (!rpcUrl) throw new Error("Missing NEXT_PUBLIC_RPC_URL, VITE_FHENIX_RPC_URL, or ARBITRUM_SEPOLIA_RPC_URL");
  required("MONGO_URI");
  required("ADNODE_EMBED_SECRET");

  const account = privateKeyToAccount(privateKey);
  const chain = {
    ...arbitrumSepolia,
    rpcUrls: { default: { http: [rpcUrl] }, public: { http: [rpcUrl] } },
  };
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });
  nextTxNonce = await withTimeout(
    publicClient.getTransactionCount({ address: account.address, blockTag: "pending" }),
    "pending nonce read",
    30_000,
  );

  console.log(`Smoke wallet: ${account.address}`);
  console.log(`Registry: ${registryAddress}`);
  console.log(`Analytics: ${analyticsAddress}`);

  const balance = await withTimeout(publicClient.getBalance({ address: account.address }), "wallet balance read", 30_000);
  console.log(`Wallet native balance: ${formatEther(balance)} ETH`);
  if (balance < parseEther("0.00002")) {
    throw new Error("Smoke wallet balance is too low for live txs.");
  }

  const owner = (await withTimeout(publicClient.readContract({
    address: registryAddress,
    abi: adRegistryAbi,
    functionName: "owner",
  }), "registry owner read", 30_000)) as Address;
  if (owner.toLowerCase() !== account.address.toLowerCase()) {
    throw new Error(`Smoke wallet is not registry owner. owner=${owner}`);
  }

  const accessApprover = (await withTimeout(publicClient.readContract({
    address: registryAddress,
    abi: adRegistryAbi,
    functionName: "accessApprover",
  }), "access approver read", 30_000)) as Address;
  if (accessApprover.toLowerCase() !== account.address.toLowerCase()) {
    const hash = await writeTx(walletClient, {
      address: registryAddress,
      abi: adRegistryAbi,
      functionName: "setAccessApprover",
      args: [account.address],
    }, "Set access approver");
    await waitFor(publicClient, hash, "Set access approver");
  } else {
    console.log("Access approver already configured for smoke wallet.");
  }

  const settlementManagerOk = (await withTimeout(publicClient.readContract({
    address: registryAddress,
    abi: adRegistryAbi,
    functionName: "settlementManagers",
    args: [analyticsAddress],
  }), "settlement manager read", 30_000)) as boolean;
  if (!settlementManagerOk) {
    const hash = await writeTx(walletClient, {
      address: registryAddress,
      abi: adRegistryAbi,
      functionName: "setSettlementManager",
      args: [analyticsAddress, true],
    }, "Set analytics settlement manager");
    await waitFor(publicClient, hash, "Set analytics settlement manager");
  }

  const reporterRole = (await withTimeout(publicClient.readContract({
    address: analyticsAddress,
    abi: adAnalyticsAbi,
    functionName: "REPORTER_ROLE",
    args: [],
  }), "reporter role read", 30_000)) as `0x${string}`;
  const earningsRole = (await withTimeout(publicClient.readContract({
    address: analyticsAddress,
    abi: adAnalyticsAbi,
    functionName: "EARNINGS_ROLE",
    args: [],
  }), "earnings role read", 30_000)) as `0x${string}`;
  for (const [roleName, role] of [
    ["REPORTER_ROLE", reporterRole],
    ["EARNINGS_ROLE", earningsRole],
  ] as const) {
    const hasRole = (await withTimeout(publicClient.readContract({
      address: analyticsAddress,
      abi: adAnalyticsAbi,
      functionName: "hasRole",
      args: [role, account.address],
    }), `${roleName} hasRole read`, 30_000)) as boolean;
    if (!hasRole) {
      const hash = await writeTx(walletClient, {
        address: analyticsAddress,
        abi: adAnalyticsAbi,
        functionName: "grantRole",
        args: [role, account.address],
      }, `Grant ${roleName}`);
      await waitFor(publicClient, hash, `Grant ${roleName}`);
    }
  }

  const startedAt = Date.now();
  const rateEth = "0.000001";
  const fundEth = "0.000003";
  const budgetEth = "0.000003";
  const creativeUri = `https://adnode.app/smoke/${startedAt}.png`;
  const category = "smoke";
  const settlementRateWei = parseEther(rateEth);
  const budgetWei = parseEther(budgetEth);

  console.log("Loading CoFHE SDK...");
  const [{ Encryptable }, { createCofheClient, createCofheConfig }, { arbSepolia }] = await withTimeout(
    Promise.all([import("@cofhe/sdk"), import("@cofhe/sdk/node"), import("@cofhe/sdk/chains")]),
    "CoFHE SDK imports",
    60_000,
  );
  const cofhe = createCofheClient(createCofheConfig({ supportedChains: [arbSepolia] }));
  console.log("Connecting CoFHE client...");
  await withTimeout(cofhe.connect(publicClient as any, walletClient as any), "CoFHE connect", 60_000);
  console.log("Encrypting campaign inputs with CoFHE...");
  const [encBudget, encCpc] = await withTimeout(cofhe
    .encryptInputs([Encryptable.uint64(budgetWei), Encryptable.uint32(1_000_000n)])
    .setAccount(account.address)
    .setChainId(arbitrumSepolia.id)
    .execute(), "CoFHE campaign input encryption", 180_000);

  const createHash = await writeTx(walletClient, {
    address: registryAddress,
    abi: adRegistryAbi,
    functionName: "createCampaign",
    args: [creativeUri, category, encBudget, encCpc, 1, settlementRateWei],
    value: parseEther(fundEth),
  }, "Create and fund campaign");
  await waitFor(publicClient, createHash, "Create and fund campaign");

  const campaignId = ((await withTimeout(publicClient.readContract({
    address: registryAddress,
    abi: adRegistryAbi,
    functionName: "nextCampaignId",
    args: [],
  }), "next campaign id read", 30_000)) as bigint) - 1n;
  console.log(`Campaign ID: ${campaignId}`);

  const campaignDoc = await withTimeout(createCampaign({
    chainCampaignId: campaignId.toString(),
    title: `Smoke Campaign ${startedAt}`,
    description: "End-to-end smoke test campaign for the production marketplace flow.",
    creativeURI: creativeUri,
    category,
    pricingModel: "CPC",
    rate: rateEth,
    advertiser: account.address,
  }), "campaign metadata indexing", 60_000);
  console.log(`Campaign indexed in backend: ${JSON.stringify(campaignDoc)}`);

  const slotHash = await writeTx(walletClient, {
    address: registryAddress,
    abi: adRegistryAbi,
    functionName: "registerSlot",
    args: [`Smoke Slot ${startedAt}`, category],
  }, "Register publisher slot");
  await waitFor(publicClient, slotHash, "Register publisher slot");
  const slotId = ((await withTimeout(publicClient.readContract({
    address: registryAddress,
    abi: adRegistryAbi,
    functionName: "nextSlotId",
    args: [],
  }), "next slot id read", 30_000)) as bigint) - 1n;
  console.log(`Slot ID: ${slotId}`);

  const slotKey = `slot_smoke_${startedAt}`;
  const slotDoc = await withTimeout(createSlot({
    chainSlotId: slotId.toString(),
    slotKey,
    siteName: `Smoke Publisher ${startedAt}`,
    siteUrl: "https://publisher.example/smoke",
    category,
    dailyTrafficEstimate: "1000",
    developer: account.address,
    assignedCampaignId: "",
  }), "slot metadata indexing", 60_000);
  console.log(`Slot indexed in backend: ${JSON.stringify(slotDoc)}`);

  const requestHash = await writeTx(walletClient, {
    address: registryAddress,
    abi: adRegistryAbi,
    functionName: "requestAccess",
    args: [campaignId, slotId],
  }, "Publisher requests campaign access");
  await waitFor(publicClient, requestHash, "Publisher requests campaign access");

  const approveHash = await writeTx(walletClient, {
    address: registryAddress,
    abi: adRegistryAbi,
    functionName: "approveAccess",
    args: [campaignId, slotId],
  }, "Admin approves campaign access");
  await waitFor(publicClient, approveHash, "Admin approves campaign access");

  const accessStatus = (await withTimeout(publicClient.readContract({
    address: registryAddress,
    abi: adRegistryAbi,
    functionName: "accessStatus",
    args: [campaignId, slotId],
  }), "access status read", 30_000)) as number;
  if (Number(accessStatus) !== 2) {
    throw new Error(`Access was not approved. status=${accessStatus}`);
  }

  const assignHash = await writeTx(walletClient, {
    address: registryAddress,
    abi: adRegistryAbi,
    functionName: "assignCampaignToSlot",
    args: [slotId, campaignId],
  }, "Publisher assigns campaign to slot");
  await waitFor(publicClient, assignHash, "Publisher assigns campaign to slot");
  await withTimeout(assignSlotCampaign(slotId.toString(), campaignId.toString()), "slot assignment indexing", 60_000);

  const publisherOrigin = "https://publisher.example";
  const pageUrl = "https://publisher.example/smoke-page";
  const sessionId = `smoke-session-${startedAt}`;
  const nonce = createMeasurementNonce();
  const token = createMeasurementToken({
    chainCampaignId: campaignId.toString(),
    chainSlotId: slotId.toString(),
    slotKey,
    publisherOrigin,
    pageUrlHash: hashPageUrl(pageUrl),
    sessionId,
    nonce,
  });
  const verifiedToken = verifyMeasurementToken(token);
  await withTimeout(consumeMeasurementNonce(verifiedToken, "click"), "measurement nonce consume", 60_000);
  let replayRejected = false;
  try {
    await withTimeout(consumeMeasurementNonce(verifiedToken, "click"), "measurement nonce replay check", 60_000);
  } catch {
    replayRejected = true;
  }
  if (!replayRejected) {
    throw new Error("Measurement nonce replay was not rejected.");
  }

  const policy = evaluateMeasurementPolicy({
    eventType: "click",
    pageUrl,
    referrer: "https://publisher.example/",
    publisherOrigin,
    userAgent: "Mozilla/5.0 AdNodeSmoke/1.0",
    remoteAddress: "203.0.113.10",
  });
  if (!policy.billable || policy.fraudStatus !== "clean") {
    throw new Error(`Smoke measurement policy was not clean: ${JSON.stringify(policy)}`);
  }

  const fingerprint = buildMeasurementFingerprint({
    remoteAddress: "203.0.113.10",
    userAgent: "Mozilla/5.0 AdNodeSmoke/1.0",
    eventType: "click",
    campaignId: campaignId.toString(),
    slotId: slotId.toString(),
  });
  const eventKey = buildMeasurementEventKey({
    chainCampaignId: campaignId.toString(),
    chainSlotId: slotId.toString(),
    eventType: "click",
    fingerprint,
    nonce,
  });
  const measurement = await withTimeout(recordMeasurement({
    eventKey,
    chainCampaignId: campaignId.toString(),
    chainSlotId: slotId.toString(),
    eventType: "click",
    pricingModel: "CPC",
    rate: rateEth,
    pageUrl,
    referrer: "https://publisher.example/",
    fingerprint,
    settlementId: eventKey,
    sessionId,
    nonce,
    publisherOrigin,
    pageUrlHash: hashPageUrl(pageUrl),
    billable: policy.billable,
    fraudStatus: policy.fraudStatus,
    fraudScore: policy.fraudScore,
    fraudReasons: policy.fraudReasons,
    reviewHash: policy.reviewHash,
  }), "measurement record write", 60_000);
  if (measurement.duplicate || measurement.record.status !== "accepted") {
    throw new Error(`Measurement was not accepted: ${JSON.stringify(measurement)}`);
  }
  console.log(`Measurement accepted: ${eventKey}`);

  const duplicateMeasurement = await withTimeout(recordMeasurement({
    eventKey,
    chainCampaignId: campaignId.toString(),
    chainSlotId: slotId.toString(),
    eventType: "click",
    pricingModel: "CPC",
    rate: rateEth,
    pageUrl,
    referrer: "https://publisher.example/",
    fingerprint,
    settlementId: eventKey,
    sessionId,
    nonce,
    publisherOrigin,
    pageUrlHash: hashPageUrl(pageUrl),
    billable: policy.billable,
    fraudStatus: policy.fraudStatus,
    fraudScore: policy.fraudScore,
    fraudReasons: policy.fraudReasons,
    reviewHash: policy.reviewHash,
  }), "duplicate measurement record write", 60_000);
  if (!duplicateMeasurement.duplicate) {
    throw new Error("Duplicate measurement write was not rejected.");
  }
  console.log("Duplicate measurement rejected by backend uniqueness.");

  const { syncMeasurementToChain, replayPendingMeasurements } = await import("../server/settlement-service.js");
  const settlement = await withTimeout(syncMeasurementToChain(measurement.record), "measurement settlement sync", 240_000);
  if (settlement.status !== "settled" || !settlement.txHash) {
    throw new Error(`Settlement did not credit payout: ${JSON.stringify(settlement)}`);
  }
  console.log(`Settlement credited: ${settlement.txHash}`);
  console.log(`  ${txUrl(settlement.txHash)}`);

  const registrySettlementId = smokeSettlementId({
    chainCampaignId: campaignId.toString(),
    chainSlotId: slotId.toString(),
    eventType: "click",
    settlementId: eventKey,
  });
  const analyticsEventId = smokeSettlementId({
    chainCampaignId: campaignId.toString(),
    chainSlotId: slotId.toString(),
    eventType: "click",
    settlementId: eventKey,
    suffix: "event",
  });
  const settledOnChain = (await withTimeout(publicClient.readContract({
    address: registryAddress,
    abi: adRegistryAbi,
    functionName: "settledEventOrEpoch",
    args: [registrySettlementId],
  }), "settled event read", 30_000)) as boolean;
  const countedOnChain = (await withTimeout(publicClient.readContract({
    address: analyticsAddress,
    abi: adAnalyticsAbi,
    functionName: "countedEvents",
    args: [analyticsEventId],
  }), "counted event read", 30_000)) as boolean;
  if (!settledOnChain || !countedOnChain) {
    throw new Error(`On-chain non-replayable accounting failed. settled=${settledOnChain} counted=${countedOnChain}`);
  }

  const replaySummary = await withTimeout(replayPendingMeasurements(), "settlement replay summary", 120_000);
  console.log(`Settlement replay summary after direct settlement: ${JSON.stringify(replaySummary)}`);

  const claimableBefore = (await withTimeout(publicClient.readContract({
    address: registryAddress,
    abi: adRegistryAbi,
    functionName: "claimableEarnings",
    args: [account.address],
  }), "claimable earnings read before withdraw", 30_000)) as bigint;
  console.log(`Claimable earnings before withdraw: ${formatEther(claimableBefore)} ETH`);
  if (claimableBefore < settlementRateWei) {
    throw new Error(`Claimable earnings too low after settlement: ${claimableBefore}`);
  }

  const claimHash = await writeTx(walletClient, {
    address: registryAddress,
    abi: adRegistryAbi,
    functionName: "claimMyEarnings",
  }, "Developer withdraws claimable earnings");
  await waitFor(publicClient, claimHash, "Developer withdraws claimable earnings");
  const claimableAfter = (await withTimeout(publicClient.readContract({
    address: registryAddress,
    abi: adRegistryAbi,
    functionName: "claimableEarnings",
    args: [account.address],
  }), "claimable earnings read after withdraw", 30_000)) as bigint;
  if (claimableAfter !== 0n) {
    throw new Error(`Claimable earnings were not cleared after withdraw: ${claimableAfter}`);
  }

  const pauseHash = await writeTx(walletClient, {
    address: registryAddress,
    abi: adRegistryAbi,
    functionName: "setCampaignActive",
    args: [campaignId, false],
  }, "Advertiser pauses campaign");
  await waitFor(publicClient, pauseHash, "Advertiser pauses campaign");

  const withdrawAmount = parseEther("0.000001");
  const withdrawHash = await writeTx(walletClient, {
    address: registryAddress,
    abi: adRegistryAbi,
    functionName: "withdrawUnspentCampaignFunds",
    args: [campaignId, withdrawAmount],
  }, "Advertiser withdraws unspent campaign funds");
  await waitFor(publicClient, withdrawHash, "Advertiser withdraws unspent campaign funds");

  const funding = (await withTimeout(publicClient.readContract({
    address: registryAddress,
    abi: adRegistryAbi,
    functionName: "getCampaignFunding",
    args: [campaignId],
  }), "campaign funding read", 30_000)) as [bigint, bigint, bigint];
  console.log(
    `Final funding: available=${formatEther(funding[0])} totalFunded=${formatEther(funding[1])} totalSettled=${formatEther(funding[2])}`,
  );

  console.log("SMOKE_TEST_PASS");
  process.exit(0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error);
  process.exit(1);
});
