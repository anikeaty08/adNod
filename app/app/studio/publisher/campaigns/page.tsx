"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, usePublicClient, useReadContract, useWalletClient } from "wagmi";
import { waitForTransactionReceipt } from "viem/actions";
import type { Abi } from "viem";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Field, TextInput } from "@/components/ui/field";
import { PrimaryButton } from "@/components/ui/primary-button";
import { getJson } from "@/lib/adnode-api";
import { estimateFeeOverrides } from "@/lib/fees";
import { CONTRACTS, CONTRACTS_CONFIGURED, adRegistryAbi } from "@/lib/contracts";
import { displayCampaignTitle } from "@/lib/campaign-title";
import { useOverlay } from "@/components/providers/overlay-provider";

type CampaignRow = {
  chainCampaignId?: string;
  title?: string;
  description?: string;
  creativeURI?: string;
  category?: string;
  pricingModel?: "CPC" | "CPM";
  rate?: string;
  advertiser?: string;
};

type SlotRow = {
  chainSlotId?: string;
  slotKey?: string;
  siteName?: string;
  category?: string;
  developer?: string;
  assignedCampaignId?: string;
};

type PublicCampaign = {
  id: string;
  title: string;
  description: string;
  advertiser: string;
  creativeURI: string;
  assetUrl: string;
  assetKind: "image" | "video" | "unknown";
  category: string;
  pricingModel: "CPC" | "CPM";
  rate: string;
  active: boolean;
};

const registryAbi = adRegistryAbi as Abi;

function shortAddress(addr: string) {
  if (!addr.startsWith("0x") || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function byDescId(a: CampaignRow, b: CampaignRow) {
  return Number(String(b.chainCampaignId ?? 0)) - Number(String(a.chainCampaignId ?? 0));
}

export default function PublisherCampaignsPage() {
  const overlay = useOverlay();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [query, setQuery] = useState("");

  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [publicCampaign, setPublicCampaign] = useState<PublicCampaign | null>(null);
  const [busy, setBusy] = useState("");

  const { data: accessApprover } = useReadContract({
    address: CONTRACTS.registry,
    abi: registryAbi,
    functionName: "accessApprover",
    query: { enabled: CONTRACTS_CONFIGURED },
  });

  const requiresApproval =
    typeof accessApprover === "string" && accessApprover.toLowerCase() !== "0x0000000000000000000000000000000000000000";

  const mySlots = useMemo(() => {
    const a = (address ?? "").toLowerCase();
    const list = slots.filter((s) => (a ? String(s.developer ?? "").toLowerCase() === a : true));
    return list.sort((x, y) => Number(String(y.chainSlotId ?? 0)) - Number(String(x.chainSlotId ?? 0)));
  }, [address, slots]);

  const selectedSlot = useMemo(() => mySlots.find((s) => String(s.chainSlotId ?? "") === selectedSlotId) ?? null, [mySlots, selectedSlotId]);

  const selectedCampaignNum = useMemo(() => (/^\\d+$/.test(selectedCampaignId) ? BigInt(selectedCampaignId) : null), [selectedCampaignId]);
  const selectedSlotNum = useMemo(() => (/^\\d+$/.test(selectedSlotId) ? BigInt(selectedSlotId) : null), [selectedSlotId]);

  const { data: accessStatusRaw, refetch: refetchAccessStatus } = useReadContract({
    address: CONTRACTS.registry,
    abi: registryAbi,
    functionName: "accessStatus",
    args: requiresApproval && selectedCampaignNum != null && selectedSlotNum != null ? [selectedCampaignNum, selectedSlotNum] : undefined,
    query: { enabled: requiresApproval && selectedCampaignNum != null && selectedSlotNum != null },
  });

  const accessStatus = useMemo(() => {
    const v = typeof accessStatusRaw === "bigint" ? Number(accessStatusRaw) : Number(accessStatusRaw ?? 0);
    switch (v) {
      case 1:
        return "Requested";
      case 2:
        return "Approved";
      case 3:
        return "Denied";
      case 4:
        return "Revoked";
      default:
        return "None";
    }
  }, [accessStatusRaw]);

  const loadLists = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([getJson<CampaignRow[]>("/api/campaigns"), getJson<SlotRow[]>("/api/slots")]);
      setCampaigns((Array.isArray(c) ? c : []).slice().sort(byDescId));
      setSlots(Array.isArray(s) ? s : []);
    } catch {
      setCampaigns([]);
      setSlots([]);
    }
  }, []);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  useEffect(() => {
    if (!selectedSlotId && mySlots[0]?.chainSlotId) {
      setSelectedSlotId(String(mySlots[0].chainSlotId));
    }
  }, [mySlots, selectedSlotId]);

  useEffect(() => {
    if (!selectedCampaignId) {
      setPublicCampaign(null);
      return;
    }
    void (async () => {
      try {
        const pc = await getJson<PublicCampaign>(`/api/public-campaign?id=${encodeURIComponent(selectedCampaignId)}`);
        setPublicCampaign(pc);
      } catch {
        setPublicCampaign(null);
      }
    })();
  }, [selectedCampaignId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = campaigns;
    if (!q) return list;
    return list.filter((c) => {
      const id = String(c.chainCampaignId ?? "");
      const title = String(c.title ?? "");
      const cat = String(c.category ?? "");
      const desc = String(c.description ?? "");
      return [id, title, cat, desc].some((s) => s.toLowerCase().includes(q));
    });
  }, [campaigns, query]);

  const requestAccess = useCallback(async () => {
    if (!requiresApproval || !address || !publicClient || !walletClient || !selectedSlotNum || !selectedCampaignNum) return;
    setBusy("");
    await overlay.withMoney(async () => {
      const feeOverrides = await estimateFeeOverrides(publicClient);
      const hash = await walletClient.writeContract({
        address: CONTRACTS.registry,
        abi: registryAbi,
        functionName: "requestAccess",
        args: [selectedCampaignNum, selectedSlotNum],
        ...feeOverrides,
      });
      await waitForTransactionReceipt(publicClient, { hash });
      await refetchAccessStatus();
    });
  }, [requiresApproval, address, publicClient, walletClient, overlay, selectedSlotNum, selectedCampaignNum, refetchAccessStatus]);

  const assign = useCallback(async () => {
    if (!address || !publicClient || !walletClient || !selectedSlotNum || !selectedCampaignNum) return;
    if (requiresApproval && accessStatus !== "Approved") {
      setBusy("Request access first. Assignment is enabled after approval.");
      return;
    }
    setBusy("");
    await overlay.withMoney(async () => {
      const feeOverrides = await estimateFeeOverrides(publicClient);
      const hash = await walletClient.writeContract({
        address: CONTRACTS.registry,
        abi: registryAbi,
        functionName: "assignCampaignToSlot",
        args: [selectedSlotNum, selectedCampaignNum],
        ...feeOverrides,
      });
      await waitForTransactionReceipt(publicClient, { hash });
      await loadLists();
    });
  }, [address, publicClient, walletClient, overlay, selectedSlotNum, selectedCampaignNum, requiresApproval, accessStatus, loadLists]);

  const slotSummary = selectedSlot
    ? `${selectedSlot.siteName || "Placement"} (#${selectedSlot.chainSlotId})${selectedSlot.slotKey ? ` · ${selectedSlot.slotKey}` : ""}`
    : "Select a placement";

  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text)] md:text-3xl">Campaigns</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">Browse campaigns, request access, then assign one to your placement.</p>
      </header>

      {!CONTRACTS_CONFIGURED ? (
        <GlassPanel className="p-5">
          <p className="text-sm text-muted">Contracts are not configured for this build.</p>
        </GlassPanel>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <GlassPanel className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Your placement</p>
          <p className="mt-2 text-sm text-[var(--text)]">{slotSummary}</p>
          <div className="mt-4 space-y-3">
            <Field label="Placement id">
              <TextInput
                value={selectedSlotId}
                onChange={(e) => setSelectedSlotId(e.target.value)}
                placeholder={mySlots[0]?.chainSlotId ? String(mySlots[0].chainSlotId) : "1"}
              />
            </Field>
            <p className="text-xs text-muted">
              Tip: activate a placement in Slots first. This list is filtered to your connected wallet when possible.
            </p>
          </div>
        </GlassPanel>

        <GlassPanel className="p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Discovery</p>
              <p className="mt-1 text-sm text-muted">{filtered.length} campaign(s)</p>
            </div>
            <div className="min-w-[240px]">
              <Field label="Search">
                <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="title, category, id…" />
              </Field>
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_360px]">
            <div className="space-y-2">
              <ul className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                {filtered.map((c) => {
                  const id = String(c.chainCampaignId ?? "");
                  const active = selectedCampaignId === id;
                  const title = displayCampaignTitle({ title: c.title ? String(c.title) : null, chainCampaignId: Number(id || 0) });
                  return (
                    <li key={id || Math.random()}>
                      <button
                        type="button"
                        className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                          active
                            ? "border-accent bg-[color-mix(in_srgb,var(--accent)_14%,transparent)]"
                            : "border-border hover:bg-[color-mix(in_srgb,var(--text)_6%,transparent)]"
                        }`}
                        onClick={() => setSelectedCampaignId(id)}
                      >
                        <p className="text-sm font-semibold text-[var(--text)]">{title}</p>
                        <p className="mt-1 text-xs text-muted">
                          {c.category ? String(c.category) : "general"} · {c.pricingModel ?? "CPC"} · {c.rate ? `${c.rate} ETH` : "rate N/A"}
                        </p>
                        {c.advertiser ? <p className="mt-1 text-[11px] text-muted">Hoster: {shortAddress(String(c.advertiser))}</p> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-border bg-[color-mix(in_srgb,var(--surface-solid)_92%,transparent)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Selected campaign</p>
                {selectedCampaignId ? (
                  <>
                    <p className="mt-2 text-sm text-[var(--text)]">
                      {publicCampaign?.title || `Campaign #${selectedCampaignId}`}
                    </p>
                    <p className="mt-1 text-xs text-muted">{publicCampaign?.description || "Preview loads after selection."}</p>

                    {publicCampaign?.assetUrl ? (
                      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-[color-mix(in_srgb,var(--text)_4%,transparent)]">
                        {publicCampaign.assetKind === "video" ? (
                          <video src={publicCampaign.assetUrl} muted playsInline loop autoPlay style={{ width: "100%", display: "block" }} />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img alt={publicCampaign.title} src={publicCampaign.assetUrl} style={{ width: "100%", display: "block", objectFit: "cover" }} />
                        )}
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {requiresApproval ? (
                        <PrimaryButton
                          variant="secondary"
                          disabled={!selectedSlotId || !selectedCampaignId || !!busy || accessStatus === "Requested"}
                          onClick={() => void requestAccess().catch((e) => setBusy(e instanceof Error ? e.message : "Request failed"))}
                        >
                          {accessStatus === "Requested" ? "Requested" : "Request access"}
                        </PrimaryButton>
                      ) : null}
                      <PrimaryButton
                        disabled={!selectedSlotId || !selectedCampaignId || !!busy || (requiresApproval && accessStatus !== "Approved")}
                        onClick={() => void assign().catch((e) => setBusy(e instanceof Error ? e.message : "Assign failed"))}
                      >
                        Assign campaign
                      </PrimaryButton>
                    </div>
                    {requiresApproval ? (
                      <p className="mt-2 text-xs text-muted">
                        Access status: <span className="font-semibold text-[var(--text)]">{accessStatus}</span>
                      </p>
                    ) : null}
                    {busy ? <p className="mt-3 text-xs text-muted">{busy}</p> : null}
                  </>
                ) : (
                  <p className="mt-2 text-sm text-muted">Pick a campaign on the left to see preview + actions.</p>
                )}
              </div>

              <div className="rounded-2xl border border-border bg-[color-mix(in_srgb,var(--surface-solid)_92%,transparent)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">How it works</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted">
                  <li>Request access (if enabled), then assign to your placement.</li>
                  <li>Embed uses the placement key so ids are not guessable.</li>
                  <li>Impressions send after ~5 seconds viewable.</li>
                </ul>
              </div>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
