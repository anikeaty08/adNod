"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useChainId, usePublicClient, useWalletClient, useSignMessage } from "wagmi";
import { parseEther } from "viem";
import { waitForTransactionReceipt } from "viem/actions";
import type { Abi, PublicClient } from "viem";
import { CONTRACTS, CONTRACTS_CONFIGURED, adRegistryAbi } from "@/lib/contracts";
import { ADNODE_CHAIN_ID } from "@/lib/chain";
import { getJson, signedPostJson, signedPostMultipart } from "@/lib/adnode-api";
import { estimateFeeOverrides } from "@/lib/fees";
import { GlassPanel } from "@/components/ui/glass-panel";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Field, TextInput, TextArea, Select } from "@/components/ui/field";
import { useOverlay } from "@/components/providers/overlay-provider";

const registryAbi = adRegistryAbi as Abi;
const SETTLEMENT_CPC = 1;
const SETTLEMENT_CPM = 2;
const UINT64_MAX = (1n << 64n) - 1n;
const UINT32_MAX = 4294967295n;

const PRESET_CATEGORIES = ["news", "gaming", "finance", "tech", "lifestyle", "sports", "crypto", "podcasts", "education"];
const CUSTOM_CAT = "__custom__";

/** Ready-to-submit sample campaign (no curl) — connect wallet, review, then Pay & create. */
const SAMPLE_CAMPAIGN: Record<string, string> = {
  creativeUri: "https://picsum.photos/seed/adnode-demo/800/400",
  title: "AdNode demo campaign",
  description:
    "Sample campaign for listings and embeds. Edit this copy before production. Category matches publisher slots using the same string.",
  category: "news",
  rate: "0.0001",
  budgetEth: "0.01",
  cpcUint32: "1000000",
  initialFundEth: "0.01",
};

function toInTuple(enc: { ctHash: bigint; securityZone: number; utype: number; signature: `0x${string}` }) {
  return { ctHash: enc.ctHash, securityZone: enc.securityZone, utype: enc.utype, signature: enc.signature };
}

function ctHashToBigInt(h: string | bigint | number): bigint {
  if (typeof h === "bigint") return h;
  return BigInt(h);
}

/** CoFHE `FHE.asEuint64/asEuint32` verification is very gas-heavy on-chain; default estimates often fail with "Internal JSON-RPC error". */
const CREATE_GAS_MIN = 8_000_000n;
const CREATE_GAS_FALLBACK = 14_000_000n;
/** Arbitrum-family blocks are ~32M+ gas; cap high so writes are not starved after a low estimate. */
const CREATE_GAS_MAX = 30_000_000n;

function formatCreateCampaignError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();
  if (lower.includes("internal json-rpc") || lower.includes("json-rpc")) {
    return (
      `${raw}\n\n` +
      "CoFHE campaigns use heavy FHE verification — try again (this build sends a higher gas limit). " +
      "If it still fails: switch your wallet to another Arbitrum Sepolia RPC, reload the page to re-encrypt, " +
      "and confirm you are on chain " +
      String(ADNODE_CHAIN_ID) +
      " with enough ETH for gas + “Pay now”."
    );
  }
  if (lower.includes("execution reverted")) {
    return (
      `${raw}\n\n` +
      "CoFHE inputs are bound to the wallet address and chain used when encrypting. Use the same account for “Encrypt” and the on-chain tx, stay on chain " +
      String(ADNODE_CHAIN_ID) +
      ", then click Pay again (fresh encryption). If this persists, the Task Manager may be rejecting the verifier signature — upgrade @fhenixprotocol/cofhe-contracts / @cofhe/sdk to match current Fhenix testnet docs."
    );
  }
  return raw;
}

async function gasForCreateCampaign(
  publicClient: PublicClient,
  args: {
    creativeUri: string;
    category: string;
    budgetIn: ReturnType<typeof toInTuple>;
    cpcIn: ReturnType<typeof toInTuple>;
    model: number;
    settlementRateWei: bigint;
    fundValue: bigint;
    account: `0x${string}`;
  },
): Promise<bigint> {
  try {
    const est = await publicClient.estimateContractGas({
      address: CONTRACTS.registry,
      abi: registryAbi,
      functionName: "createCampaign",
      args: [args.creativeUri, args.category, args.budgetIn, args.cpcIn, args.model, args.settlementRateWei],
      account: args.account,
      value: args.fundValue,
    });
    const buffered = (est * 15n) / 10n;
    if (buffered < CREATE_GAS_MIN) return CREATE_GAS_MIN;
    if (buffered > CREATE_GAS_MAX) return CREATE_GAS_MAX;
    return buffered;
  } catch {
    return CREATE_GAS_FALLBACK;
  }
}

export function AdvertiserPanel() {
  const overlay = useOverlay();
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { signMessageAsync } = useSignMessage();

  const [creativeUri, setCreativeUri] = useState(SAMPLE_CAMPAIGN.creativeUri);
  const [title, setTitle] = useState(SAMPLE_CAMPAIGN.title);
  const [description, setDescription] = useState(SAMPLE_CAMPAIGN.description);
  const [category, setCategory] = useState(SAMPLE_CAMPAIGN.category);
  const [categoryMode, setCategoryMode] = useState<string>(SAMPLE_CAMPAIGN.category);
  const [apiCategories, setApiCategories] = useState<string[]>([]);

  useEffect(() => {
    void getJson<Array<Record<string, unknown>>>("/api/campaigns")
      .then((rows) => {
        const s = new Set<string>();
        for (const r of rows ?? []) {
          const c = String(r.category ?? "").trim();
          if (c) s.add(c);
        }
        setApiCategories([...s]);
      })
      .catch(() => setApiCategories([]));
  }, []);

  const categoryOptions = useMemo(() => {
    const m = new Set<string>([...PRESET_CATEGORIES, ...apiCategories].map((x) => x.trim()).filter(Boolean));
    return [...m].sort((a, b) => a.localeCompare(b));
  }, [apiCategories]);
  const [pricingModel, setPricingModel] = useState<"CPC" | "CPM">("CPC");
  const [rate, setRate] = useState(SAMPLE_CAMPAIGN.rate);
  const [budgetEth, setBudgetEth] = useState(SAMPLE_CAMPAIGN.budgetEth);
  const [cpcUint32, setCpcUint32] = useState(SAMPLE_CAMPAIGN.cpcUint32);
  const [initialFundEth, setInitialFundEth] = useState(SAMPLE_CAMPAIGN.initialFundEth);
  const [busy, setBusy] = useState("");
  const [newCampaignId, setNewCampaignId] = useState<string | null>(null);

  const uploadCreative = useCallback(
    async (file: File) => {
      if (!address) throw new Error("Connect wallet first.");
      await overlay.withLoading(async () => {
        const meta = { filename: file.name, size: file.size, type: file.type || "application/octet-stream" };
        const { uri } = await signedPostMultipart(
          "/api/uploads/creative",
          "uploads:creative",
          meta,
          file,
          "file",
          signMessageAsync,
          address,
        );
        setCreativeUri(uri);
      });
    },
    [address, overlay, signMessageAsync],
  );

  const payAndCreate = useCallback(async () => {
    if (!address || !publicClient || !walletClient) throw new Error("Connect wallet on the right network.");
    if (chainId !== ADNODE_CHAIN_ID) throw new Error("Switch to AdNode chain in your wallet.");

    const walletMeta = walletClient as unknown as { chain?: { id?: number }; account?: { address?: string } };
    if (walletMeta.chain?.id && walletMeta.chain.id !== ADNODE_CHAIN_ID) throw new Error("Switch to AdNode chain in your wallet.");
    if (walletMeta.account?.address && walletMeta.account.address.toLowerCase() !== address.toLowerCase()) {
      throw new Error("Active wallet account changed. Reconnect wallet and try again.");
    }
    if (!creativeUri || !category || !title || !description) throw new Error("Fill creative, title, description, and category.");

    const settlementRateWei = parseEther(rate);
    const model = pricingModel === "CPC" ? SETTLEMENT_CPC : SETTLEMENT_CPM;
    let budgetWei = parseEther(budgetEth);
    if (budgetWei > UINT64_MAX) budgetWei = UINT64_MAX;
    let cpcBi = BigInt(cpcUint32 || "0");
    if (cpcBi > UINT32_MAX) cpcBi = UINT32_MAX;

    const { budgetIn, cpcIn, fundValue } = await overlay.withLoading(async () => {
      // Dynamic import to avoid evaluating CoFHE's web runtime during Next.js prerender/build.
      const [{ createCofheClient, createCofheConfig }, { Encryptable }, { arbSepolia }] = await Promise.all([
        import("@cofhe/sdk/web"),
        import("@cofhe/sdk"),
        import("@cofhe/sdk/chains"),
      ]);

      const config = createCofheConfig({ supportedChains: [arbSepolia] });
      const cofhe = createCofheClient(config);
      await cofhe.connect(publicClient, walletClient);
      const [encB, encC] = await cofhe
        .encryptInputs([Encryptable.uint64(budgetWei), Encryptable.uint32(cpcBi)])
        .setAccount(address)
        .setChainId(ADNODE_CHAIN_ID)
        .execute();
      const budgetIn = toInTuple({
        ctHash: ctHashToBigInt(encB.ctHash as string | bigint | number),
        securityZone: encB.securityZone,
        utype: encB.utype,
        signature: encB.signature as `0x${string}`,
      });
      const cpcIn = toInTuple({
        ctHash: ctHashToBigInt(encC.ctHash as string | bigint | number),
        securityZone: encC.securityZone,
        utype: encC.utype,
        signature: encC.signature as `0x${string}`,
      });
      const fundValue = parseEther(initialFundEth);
      return { budgetIn, cpcIn, fundValue };
    });

    await overlay.withMoney(async () => {
      const gas = await gasForCreateCampaign(publicClient, {
        creativeUri,
        category,
        budgetIn,
        cpcIn,
        model,
        settlementRateWei,
        fundValue,
        account: address,
      });
      const feeOverrides = await estimateFeeOverrides(publicClient);

      try {
        // Do not pass `gas` here: a capped eth_call can OOG during FHE.verifyInput and surface as generic "execution reverted".
        await publicClient.simulateContract({
          address: CONTRACTS.registry,
          abi: registryAbi,
          functionName: "createCampaign",
          args: [creativeUri, category, budgetIn, cpcIn, model, settlementRateWei],
          account: address,
          value: fundValue,
        });
      } catch (simErr) {
        throw new Error(formatCreateCampaignError(simErr));
      }

      let hash: `0x${string}`;
      try {
        hash = await walletClient.writeContract({
          address: CONTRACTS.registry,
          abi: registryAbi,
          functionName: "createCampaign",
          args: [creativeUri, category, budgetIn, cpcIn, model, settlementRateWei],
          value: fundValue,
          gas,
          ...feeOverrides,
        });
      } catch (writeErr) {
        throw new Error(formatCreateCampaignError(writeErr));
      }
      await waitForTransactionReceipt(publicClient, { hash });
      const next = (await publicClient.readContract({
        address: CONTRACTS.registry,
        abi: registryAbi,
        functionName: "nextCampaignId",
      })) as bigint;
      const createdId = (next - 1n).toString();
      setNewCampaignId(createdId);

      // Auto-sync so the landing page / publishers can discover the campaign via API immediately.
      try {
        await signedPostJson(
          "/api/campaigns",
          "campaigns:create",
          {
            chainCampaignId: createdId,
            title,
            description,
            creativeURI: creativeUri,
            category,
            pricingModel,
            rate,
            advertiser: address,
          },
          signMessageAsync,
          address,
        );
      } catch (e) {
        setBusy(`Campaign created on-chain (#${createdId}) but API sync failed: ${e instanceof Error ? e.message : "Sync failed"}`);
      }
    });
  }, [
    address,
    overlay,
    publicClient,
    walletClient,
    chainId,
    creativeUri,
    category,
    title,
    description,
    rate,
    pricingModel,
    budgetEth,
    cpcUint32,
    initialFundEth,
    signMessageAsync,
  ]);

  const syncMetadata = useCallback(async () => {
    if (!address || !newCampaignId) return;
    await overlay.withLoading(async () => {
      await signedPostJson(
        "/api/campaigns",
        "campaigns:create",
        {
          chainCampaignId: newCampaignId,
          title,
          description,
          creativeURI: creativeUri,
          category,
          pricingModel,
          rate,
          advertiser: address,
        },
        signMessageAsync,
        address,
      );
    });
  }, [address, newCampaignId, title, description, creativeUri, category, pricingModel, rate, overlay, signMessageAsync]);

  if (!CONTRACTS_CONFIGURED) {
    return (
      <GlassPanel className="p-5">
        <p className="text-muted text-sm">Set contract addresses in env to create campaigns.</p>
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Form is pre-filled with a demo creative URL and copy — connect your wallet on the AdNode chain, then use{" "}
        <strong className="text-[var(--text)]">Pay &amp; create campaign</strong>. No curl or CLI; CoFHE encryption runs in your browser.
      </p>
      <GlassPanel className="p-5 md:p-6">
        <div className="mt-2 grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Creative</p>
            <Field label="Upload file (Pinata)">
              <input
                type="file"
                accept="image/*,video/*"
                className="w-full rounded-panel border border-border bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] file:mr-3"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadCreative(f).catch((err) => setBusy(err instanceof Error ? err.message : "Upload failed"));
                }}
              />
            </Field>
            <Field label="Or paste URI" hint="ipfs://… or https://…">
              <TextInput value={creativeUri} onChange={(e) => setCreativeUri(e.target.value)} placeholder="ipfs://…" />
            </Field>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Campaign</p>
            <Field label="Title">
              <TextInput value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <Field label="Category" hint="Must match publisher slot category exactly. Pick a preset or choose Custom.">
              <Select
                value={categoryMode}
                onChange={(e) => {
                  const v = e.target.value;
                  setCategoryMode(v);
                  if (v === CUSTOM_CAT) {
                    setCategory("");
                    return;
                  }
                  setCategory(v);
                }}
              >
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value={CUSTOM_CAT}>Custom…</option>
              </Select>
              {categoryMode === CUSTOM_CAT ? (
                <div className="mt-2">
                  <TextInput
                    value={category}
                    onChange={(e) => setCategory(e.target.value.trim())}
                    placeholder="your-category-string"
                  />
                </div>
              ) : null}
            </Field>
            <Field label="Description">
              <TextArea value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            <Field label="Pricing">
              <Select value={pricingModel} onChange={(e) => setPricingModel(e.target.value as "CPC" | "CPM")}>
                <option value="CPC">CPC</option>
                <option value="CPM">CPM</option>
              </Select>
            </Field>
            <Field label="Public rate (ETH)" hint="Matches on-chain settlement rate.">
              <TextInput value={rate} onChange={(e) => setRate(e.target.value)} />
            </Field>
            <Field label="Encrypted budget (ETH)">
              <TextInput value={budgetEth} onChange={(e) => setBudgetEth(e.target.value)} />
            </Field>
            <Field label="Encrypted CPC scalar (uint32)">
              <TextInput value={cpcUint32} onChange={(e) => setCpcUint32(e.target.value)} />
            </Field>
            <Field label="Pay now (ETH)" hint="Initial fund sent with create tx.">
              <TextInput value={initialFundEth} onChange={(e) => setInitialFundEth(e.target.value)} />
            </Field>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <PrimaryButton
            disabled={!!busy || !creativeUri || !title || !description || !category || !address}
            onClick={() => void payAndCreate().catch((e) => setBusy(e instanceof Error ? e.message : "Failed"))}
          >
            Pay & create campaign
          </PrimaryButton>
        </div>
        {busy ? <p className="mt-3 text-sm text-muted">{busy}</p> : null}
      </GlassPanel>

      {newCampaignId ? (
        <GlassPanel className="p-5 md:p-6">
          <p className="text-sm text-muted">
            On-chain <span className="font-mono text-[var(--text)]">#{newCampaignId}</span>
          </p>
          <PrimaryButton
            className="mt-4"
            disabled={!!busy}
            onClick={() => void syncMetadata().catch((e) => setBusy(e instanceof Error ? e.message : "Sync failed"))}
          >
            Sync to API
          </PrimaryButton>
        </GlassPanel>
      ) : null}
    </div>
  );
}
