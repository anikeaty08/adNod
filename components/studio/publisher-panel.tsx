"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, usePublicClient, useReadContract, useWalletClient } from "wagmi";
import { waitForTransactionReceipt } from "viem/actions";
import { decodeEventLog } from "viem";
import type { Abi } from "viem";
import { CONTRACTS, CONTRACTS_CONFIGURED, adRegistryAbi } from "@/lib/contracts";
import { getJson, postJson } from "@/lib/adnode-api";
import { buildEmbedForLanguage, type EmbedLanguage } from "@/lib/embed";
import { estimateFeeOverrides } from "@/lib/fees";
import { GlassPanel } from "@/components/ui/glass-panel";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Field, TextInput } from "@/components/ui/field";
import { useOverlay } from "@/components/providers/overlay-provider";

const registryAbi = adRegistryAbi as Abi;

type CampaignRow = {
  chainCampaignId?: string;
  title?: string;
  category?: string;
};

type SlotRow = {
  chainSlotId: string;
  slotKey?: string;
  siteName: string;
  category: string;
  assignedCampaignId?: string;
};

const LANGS: { id: EmbedLanguage; label: string }[] = [
  { id: "script", label: "Script (any site)" },
  { id: "html", label: "HTML iframe" },
  { id: "react", label: "React" },
  { id: "next", label: "Next.js (client)" },
];

export function PublisherPanel({ view = "slots" }: { view?: "slots" | "embeds" }) {
  const overlay = useOverlay();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [siteName, setSiteName] = useState("");
  const [category, setCategory] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [traffic, setTraffic] = useState("1000");
  const [selectedSlot, setSelectedSlot] = useState<SlotRow | null>(null);
  const [assignCampaignId, setAssignCampaignId] = useState("");
  const [busy, setBusy] = useState("");
  const [embedLang, setEmbedLang] = useState<EmbedLanguage>("script");
  const [origin, setOrigin] = useState("");

  const { data: accessApprover } = useReadContract({
    address: CONTRACTS.registry,
    abi: registryAbi,
    functionName: "accessApprover",
    query: { enabled: CONTRACTS_CONFIGURED },
  });

  const requiresApproval =
    typeof accessApprover === "string" && accessApprover.toLowerCase() !== "0x0000000000000000000000000000000000000000";

  const loadLists = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([getJson<CampaignRow[]>("/api/campaigns"), getJson<unknown[]>("/api/slots")]);
      setCampaigns(Array.isArray(c) ? c : []);
      const normalized = (Array.isArray(s) ? s : []).map((row) => {
        const r = row as Record<string, unknown>;
        return {
          chainSlotId: String(r.chainSlotId ?? r.id ?? ""),
          slotKey: typeof r.slotKey === "string" ? r.slotKey : undefined,
          siteName: String(r.siteName ?? ""),
          category: String(r.category ?? ""),
          assignedCampaignId: String(r.assignedCampaignId ?? ""),
        } satisfies SlotRow;
      });
      setSlots(normalized.filter((x) => x.chainSlotId));
    } catch {
      setCampaigns([]);
      setSlots([]);
    }
  }, []);

  useEffect(() => {
    void loadLists();
  }, [loadLists]);

  useEffect(() => {
    setOrigin(window.location.origin);
    if (!siteUrl) setSiteUrl(window.location.origin);
    if (!siteName) setSiteName(window.location.hostname.replace(/^www\./, ""));
  }, [siteName, siteUrl]);

  const visibleCampaigns = useMemo(() => campaigns, [campaigns]);

  const slotIdBig =
    selectedSlot?.chainSlotId && /^\d+$/.test(selectedSlot.chainSlotId) ? BigInt(selectedSlot.chainSlotId) : null;
  const campaignIdBig = assignCampaignId && /^\d+$/.test(assignCampaignId) ? BigInt(assignCampaignId) : null;

  const { data: accessStatusRaw, refetch: refetchAccessStatus } = useReadContract({
    address: CONTRACTS.registry,
    abi: registryAbi,
    functionName: "accessStatus",
    args: requiresApproval && slotIdBig != null && campaignIdBig != null ? [campaignIdBig, slotIdBig] : undefined,
    query: { enabled: requiresApproval && slotIdBig != null && campaignIdBig != null },
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

  const registerSlot = useCallback(async () => {
    if (!address || !publicClient || !walletClient) return;

    setBusy("");
    await overlay.withMoney(async () => {
      const feeOverrides = await estimateFeeOverrides(publicClient);
      const txHash = await walletClient.writeContract({
        address: CONTRACTS.registry,
        abi: registryAbi,
        functionName: "registerSlot",
        args: [siteName, category?.trim() ? category.trim() : "general"],
        ...feeOverrides,
      });

      const receipt = await waitForTransactionReceipt(publicClient, { hash: txHash });

      let chainSlotId: string | null = null;
      for (const log of receipt.logs ?? []) {
        if (String(log.address ?? "").toLowerCase() !== String(CONTRACTS.registry ?? "").toLowerCase()) continue;
        try {
          const decoded = decodeEventLog({
            abi: registryAbi as any,
            data: log.data,
            topics: log.topics,
          }) as { eventName: string; args: Record<string, unknown> };
          if (decoded.eventName !== "SlotRegistered") continue;
          const id = decoded.args.id as unknown;
          chainSlotId = typeof id === "bigint" ? id.toString() : String(id);
          break;
        } catch {
          // ignore
        }
      }

      if (!chainSlotId) {
        throw new Error("SlotRegistered event not found in tx logs.");
      }

      // Auto-index to the API (creates a slotKey for embeds; does not require a signature).
      await postJson("/api/slots-auto", {
        chainSlotId,
        txHash,
        siteUrl,
        dailyTrafficEstimate: traffic,
      });

      await loadLists();
      const created = slots.find((s) => s.chainSlotId === chainSlotId) ?? { chainSlotId, siteName, category };
      setSelectedSlot(created);
    });
  }, [address, publicClient, walletClient, overlay, siteName, category, siteUrl, traffic, loadLists, slots]);

  const assign = useCallback(async () => {
    if (!address || !publicClient || !walletClient || !selectedSlot || !assignCampaignId) return;

    setBusy("");
    await overlay.withMoney(async () => {
      const feeOverrides = await estimateFeeOverrides(publicClient);
      const hash = await walletClient.writeContract({
        address: CONTRACTS.registry,
        abi: registryAbi,
        functionName: "assignCampaignToSlot",
        args: [BigInt(selectedSlot.chainSlotId), BigInt(assignCampaignId)],
        ...feeOverrides,
      });
      await waitForTransactionReceipt(publicClient, { hash });
      await loadLists();
      setSelectedSlot((s) => (s ? { ...s, assignedCampaignId: assignCampaignId } : s));
    });
  }, [address, overlay, publicClient, walletClient, selectedSlot, assignCampaignId, loadLists]);

  const requestAccess = useCallback(async () => {
    if (!requiresApproval || !address || !publicClient || !walletClient || !selectedSlot || !campaignIdBig || !slotIdBig) return;

    setBusy("");
    await overlay.withMoney(async () => {
      const feeOverrides = await estimateFeeOverrides(publicClient);
      const hash = await walletClient.writeContract({
        address: CONTRACTS.registry,
        abi: registryAbi,
        functionName: "requestAccess",
        args: [campaignIdBig, slotIdBig],
        ...feeOverrides,
      });
      await waitForTransactionReceipt(publicClient, { hash });
      await refetchAccessStatus();
    });
  }, [requiresApproval, address, overlay, publicClient, walletClient, selectedSlot, campaignIdBig, slotIdBig, refetchAccessStatus]);

  const embedCode = selectedSlot
    ? buildEmbedForLanguage(embedLang, origin, {
        slotId: Number(selectedSlot.chainSlotId),
        slotKey: selectedSlot.slotKey || undefined,
      })
    : "";

  if (!CONTRACTS_CONFIGURED) {
    return (
      <GlassPanel className="p-5">
        <p className="text-sm text-muted">Configure contracts in env.</p>
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-4">
      {view === "slots" ? (
        <GlassPanel className="p-5 md:p-6">
          <div className="mt-1 grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">New placement</p>
              <Field label="Placement name" hint="A label for you (eg. homepage-top).">
                <TextInput value={siteName} onChange={(e) => setSiteName(e.target.value)} />
              </Field>
              <Field label="Category" hint="Optional for now; it helps organize placements.">
                <TextInput value={category} onChange={(e) => setCategory(e.target.value)} placeholder="news" list="adnode-category" />
              </Field>
              <datalist id="adnode-category">
                <option value="news" />
                <option value="sports" />
                <option value="finance" />
                <option value="gaming" />
                <option value="tech" />
              </datalist>
              <details className="rounded-panel border border-border p-3">
                <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted">Advanced</summary>
                <div className="mt-3 grid gap-3">
                  <Field label="Site URL (metadata)">
                    <TextInput value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} />
                  </Field>
                  <Field label="Traffic / day (metadata)">
                    <TextInput value={traffic} onChange={(e) => setTraffic(e.target.value)} />
                  </Field>
                </div>
              </details>
              <PrimaryButton
                disabled={!siteName || !address || !!busy}
                onClick={() => void registerSlot().catch((e) => setBusy(e instanceof Error ? e.message : "Failed"))}
              >
                Activate placement
              </PrimaryButton>
              {busy ? <p className="text-sm text-muted">{busy}</p> : null}
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Your placements</p>
              <ul className="max-h-64 space-y-1 overflow-y-auto rounded-panel border border-border p-2">
                {slots.map((s) => (
                  <li key={s.slotKey ?? s.chainSlotId}>
                    <button
                      type="button"
                      className={`w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                        selectedSlot?.chainSlotId === s.chainSlotId
                          ? "bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] text-[var(--text)]"
                          : "hover:bg-[color-mix(in_srgb,var(--text)_6%,transparent)] text-muted"
                      }`}
                      onClick={() => setSelectedSlot(s)}
                    >
                      <span className="font-medium text-[var(--text)]">{s.siteName || "Untitled placement"}</span>
                      <span className="ml-2 text-xs text-muted">{s.category || "—"}</span>
                      <span className="ml-2 font-mono text-[10px] text-muted">{s.slotKey ? s.slotKey : `#${s.chainSlotId}`}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {!slots.length ? <p className="text-sm text-muted">No placements yet — activate one.</p> : null}
            </div>
          </div>
        </GlassPanel>
      ) : null}

      {selectedSlot && view === "slots" ? (
        <GlassPanel className="p-5 md:p-6">
          <h3 className="font-display text-base font-semibold text-[var(--text)]">{selectedSlot.siteName || "Placement"}</h3>
          <p className="mt-1 text-xs text-muted">
            {selectedSlot.category || "—"} · {selectedSlot.slotKey ? selectedSlot.slotKey : `#${selectedSlot.chainSlotId}`}
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Field
              label="Campaign id"
              hint={requiresApproval ? "Request access first. Once approved, you can assign." : "Assigning is immediate on-chain."}
            >
              <TextInput value={assignCampaignId} onChange={(e) => setAssignCampaignId(e.target.value)} placeholder="1" />
            </Field>
            <div className="flex items-end">
              <div className="flex flex-wrap gap-2">
                {requiresApproval ? (
                  <PrimaryButton
                    variant="secondary"
                    disabled={!campaignIdBig || !!busy || accessStatus === "Requested" || accessStatus === "Revoked"}
                    onClick={() => void requestAccess().catch((e) => setBusy(e instanceof Error ? e.message : "Request failed"))}
                  >
                    Request access
                  </PrimaryButton>
                ) : null}
                <PrimaryButton
                  disabled={!assignCampaignId || !!busy || (requiresApproval && accessStatus !== "Approved")}
                  onClick={() => void assign().catch((e) => setBusy(e instanceof Error ? e.message : "Assign failed"))}
                >
                  Assign campaign
                </PrimaryButton>
              </div>
            </div>
          </div>

          {requiresApproval ? (
            <p className="mt-2 text-xs text-muted">
              Access status: <span className="font-semibold text-[var(--text)]">{accessStatus}</span>
              {accessStatus === "Requested" ? " (waiting for approval)" : ""}
            </p>
          ) : null}

          <p className="mt-3 text-xs text-muted">Campaigns: {visibleCampaigns.length}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {visibleCampaigns.slice(0, 12).map((c) => (
              <li key={c.chainCampaignId}>
                <button
                  type="button"
                  className="rounded-full border border-border px-2 py-0.5 text-xs text-muted hover:border-accent hover:text-[var(--text)]"
                  onClick={() => setAssignCampaignId(String(c.chainCampaignId))}
                >
                  {c.title ? c.title : `Campaign ${c.chainCampaignId}`}
                </button>
              </li>
            ))}
          </ul>
          {busy ? <p className="mt-2 text-sm text-muted">{busy}</p> : null}
        </GlassPanel>
      ) : null}

      {view === "embeds" ? (
        <GlassPanel className="p-5 md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="font-display text-base font-semibold text-[var(--text)]">Embeds</h3>
              <p className="mt-1 text-sm text-muted">Pick a placement and copy code for your stack.</p>
            </div>
            {selectedSlot ? (
              <p className="font-mono text-xs text-muted">{selectedSlot.slotKey ? selectedSlot.slotKey : `#${selectedSlot.chainSlotId}`}</p>
            ) : null}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1.3fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Placements</p>
              <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto rounded-panel border border-border p-2">
                {slots.map((s) => (
                  <li key={s.slotKey ?? s.chainSlotId}>
                    <button
                      type="button"
                      className={`w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                        selectedSlot?.chainSlotId === s.chainSlotId
                          ? "bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] text-[var(--text)]"
                          : "hover:bg-[color-mix(in_srgb,var(--text)_6%,transparent)] text-muted"
                      }`}
                      onClick={() => setSelectedSlot(s)}
                    >
                      <span className="font-medium text-[var(--text)]">{s.siteName || "Untitled placement"}</span>
                      <span className="ml-2 text-xs text-muted">{s.category || "—"}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {!slots.length ? <p className="mt-2 text-sm text-muted">No placements yet — create one in Slots.</p> : null}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Embed code</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {LANGS.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      embedLang === l.id ? "bg-accent text-[var(--bg)]" : "border border-border text-muted hover:text-[var(--text)]"
                    }`}
                    onClick={() => setEmbedLang(l.id)}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
              <textarea
                className="mt-3 w-full rounded-panel border border-border bg-[var(--bg)] p-3 font-mono text-xs text-[var(--text)]"
                readOnly
                rows={embedLang === "react" || embedLang === "next" ? 16 : 8}
                value={embedCode}
                placeholder={slots.length ? "Select a placement to generate embed code." : ""}
              />
              <PrimaryButton
                variant="ghost"
                className="mt-2"
                disabled={!embedCode}
                onClick={() => void navigator.clipboard.writeText(embedCode)}
              >
                Copy code
              </PrimaryButton>
            </div>
          </div>
        </GlassPanel>
      ) : null}
    </div>
  );
}
