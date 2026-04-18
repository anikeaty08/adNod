"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, usePublicClient, useWalletClient, useSignMessage, useReadContract } from "wagmi";
import { waitForTransactionReceipt } from "viem/actions";
import type { Abi } from "viem";
import { CONTRACTS, CONTRACTS_CONFIGURED, adRegistryAbi } from "@/lib/contracts";
import { getJson, signedPostJson } from "@/lib/adnode-api";
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
  id: string;
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

export function PublisherPanel() {
  const overlay = useOverlay();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { signMessageAsync } = useSignMessage();

  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [siteName, setSiteName] = useState("");
  const [category, setCategory] = useState("");
  const [siteUrl, setSiteUrl] = useState("https://example.com");
  const [traffic, setTraffic] = useState("1000");
  const [selectedSlot, setSelectedSlot] = useState<SlotRow | null>(null);
  const [assignCampaignId, setAssignCampaignId] = useState("");
  const [busy, setBusy] = useState("");
  const [newSlotId, setNewSlotId] = useState<string | null>(null);
  const [embedLang, setEmbedLang] = useState<EmbedLanguage>("script");
  const [origin, setOrigin] = useState("");

  const { data: nextSlotId } = useReadContract({
    address: CONTRACTS.registry,
    abi: registryAbi,
    functionName: "nextSlotId",
    query: { enabled: CONTRACTS_CONFIGURED },
  });

  const loadLists = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([getJson<CampaignRow[]>("/api/campaigns"), getJson<unknown[]>("/api/slots")]);
      setCampaigns(Array.isArray(c) ? c : []);
      const normalized = (Array.isArray(s) ? s : []).map((row) => {
        const r = row as Record<string, unknown>;
        return {
          id: String(r.chainSlotId ?? r.id ?? ""),
          siteName: String(r.siteName ?? ""),
          category: String(r.category ?? ""),
          assignedCampaignId: String(r.assignedCampaignId ?? ""),
        };
      });
      setSlots(normalized.filter((x) => x.id));
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
  }, []);

  const matchingCampaigns = useMemo(() => {
    if (!selectedSlot) return campaigns;
    return campaigns.filter((c) => (c.category || "").toLowerCase() === selectedSlot.category.toLowerCase());
  }, [campaigns, selectedSlot]);

  const registerSlot = useCallback(async () => {
    if (!address || !publicClient || !walletClient) return;
    await overlay.withMoney(async () => {
      const feeOverrides = await estimateFeeOverrides(publicClient);
      const hash = await walletClient.writeContract({
        address: CONTRACTS.registry,
        abi: registryAbi,
        functionName: "registerSlot",
        args: [siteName, category],
        ...feeOverrides,
      });
      await waitForTransactionReceipt(publicClient, { hash });
      const next = (await publicClient.readContract({
        address: CONTRACTS.registry,
        abi: registryAbi,
        functionName: "nextSlotId",
      })) as bigint;
      const id = (next - 1n).toString();
      setNewSlotId(id);
      setSelectedSlot({ id, siteName, category, assignedCampaignId: "" });
      await loadLists();
    });
  }, [address, overlay, publicClient, walletClient, siteName, category, loadLists]);

  const assign = useCallback(async () => {
    if (!address || !publicClient || !walletClient || !selectedSlot || !assignCampaignId) return;
    await overlay.withMoney(async () => {
      const feeOverrides = await estimateFeeOverrides(publicClient);
      const hash = await walletClient.writeContract({
        address: CONTRACTS.registry,
        abi: registryAbi,
        functionName: "assignCampaignToSlot",
        args: [BigInt(selectedSlot.id), BigInt(assignCampaignId)],
        ...feeOverrides,
      });
      await waitForTransactionReceipt(publicClient, { hash });
      await loadLists();
      setSelectedSlot((s) => (s ? { ...s, assignedCampaignId: assignCampaignId } : s));
    });
  }, [address, overlay, publicClient, walletClient, selectedSlot, assignCampaignId, loadLists]);

  const syncSlotMeta = useCallback(async () => {
    if (!address || !selectedSlot) return;
    await overlay.withLoading(async () => {
      await signedPostJson(
        "/api/slots",
        "slots:create",
        {
          chainSlotId: selectedSlot.id,
          siteName: selectedSlot.siteName,
          siteUrl,
          category: selectedSlot.category,
          dailyTrafficEstimate: traffic,
          developer: address,
          assignedCampaignId: selectedSlot.assignedCampaignId || "",
        },
        signMessageAsync,
        address,
      );
      await loadLists();
    });
  }, [address, selectedSlot, siteUrl, traffic, overlay, signMessageAsync, loadLists]);

  const embedCode = selectedSlot ? buildEmbedForLanguage(embedLang, origin, Number(selectedSlot.id)) : "";

  if (!CONTRACTS_CONFIGURED) {
    return (
      <GlassPanel className="p-5">
        <p className="text-sm text-muted">Configure contracts in env.</p>
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-4">
      <GlassPanel className="p-5 md:p-6">
        <div className="mt-1 grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">New slot</p>
            <Field label="Site name">
              <TextInput value={siteName} onChange={(e) => setSiteName(e.target.value)} />
            </Field>
            <Field label="Category" hint="Must match an advertiser campaign.">
              <TextInput value={category} onChange={(e) => setCategory(e.target.value)} />
            </Field>
            <PrimaryButton
              disabled={!siteName || !category || !address || !!busy}
              onClick={() => void registerSlot().catch((e) => setBusy(e instanceof Error ? e.message : "Failed"))}
            >
              Register on-chain
            </PrimaryButton>
            {newSlotId ? <p className="text-sm text-[var(--success,#22c55e)]">Slot #{newSlotId} created.</p> : null}
            <p className="text-xs text-muted">nextSlotId: {nextSlotId?.toString() ?? "—"}</p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Your slots</p>
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-panel border border-border p-2">
              {slots.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className={`w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                      selectedSlot?.id === s.id ? "bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] text-[var(--text)]" : "hover:bg-[color-mix(in_srgb,var(--text)_6%,transparent)] text-muted"
                    }`}
                    onClick={() => setSelectedSlot(s)}
                  >
                    #{s.id} · {s.siteName} · {s.category}
                  </button>
                </li>
              ))}
            </ul>
            {!slots.length ? <p className="text-sm text-muted">No slots yet — register one.</p> : null}
          </div>
        </div>
      </GlassPanel>

      {selectedSlot ? (
        <GlassPanel className="p-5 md:p-6">
          <h3 className="font-display text-base font-semibold text-[var(--text)]">Slot #{selectedSlot.id}</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Field label="Assign campaign id">
              <TextInput value={assignCampaignId} onChange={(e) => setAssignCampaignId(e.target.value)} placeholder="1" />
            </Field>
            <Field label="Site URL (metadata)">
              <TextInput value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} />
            </Field>
            <Field label="Traffic / day">
              <TextInput value={traffic} onChange={(e) => setTraffic(e.target.value)} />
            </Field>
          </div>
          <p className="mt-2 text-xs text-muted">Matching campaigns: {matchingCampaigns.length}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {matchingCampaigns.slice(0, 10).map((c) => (
              <li key={c.chainCampaignId}>
                <button
                  type="button"
                  className="rounded-full border border-border px-2 py-0.5 text-xs text-muted hover:border-accent hover:text-[var(--text)]"
                  onClick={() => setAssignCampaignId(String(c.chainCampaignId))}
                >
                  #{c.chainCampaignId} {c.title ? `· ${c.title}` : ""}
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <PrimaryButton disabled={!assignCampaignId || !!busy} onClick={() => void assign().catch((e) => setBusy(e instanceof Error ? e.message : "Assign failed"))}>
              Assign campaign
            </PrimaryButton>
            <PrimaryButton variant="secondary" disabled={!!busy} onClick={() => void syncSlotMeta().catch((e) => setBusy(e instanceof Error ? e.message : "Sync failed"))}>
              Sync metadata
            </PrimaryButton>
          </div>

          <div className="mt-6 border-t border-border pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Embed for your stack</p>
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
            />
            <PrimaryButton variant="ghost" className="mt-2" disabled={!embedCode} onClick={() => void navigator.clipboard.writeText(embedCode)}>
              Copy code
            </PrimaryButton>
          </div>
          {busy ? <p className="mt-2 text-sm text-muted">{busy}</p> : null}
        </GlassPanel>
      ) : null}
    </div>
  );
}
