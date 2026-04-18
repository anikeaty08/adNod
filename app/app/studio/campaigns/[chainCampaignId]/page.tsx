"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAccount, useReadContracts } from "wagmi";
import { formatEther, type Abi } from "viem";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getJson } from "@/lib/adnode-api";
import { GlassPanel } from "@/components/ui/glass-panel";
import { CONTRACTS, CONTRACTS_CONFIGURED, adRegistryAbi } from "@/lib/contracts";

type CampaignRow = Record<string, unknown>;

const registryAbi = adRegistryAbi as Abi;
const CHART_COLORS = ["#0ea5e9", "#6366f1", "#22c55e", "#f59e0b", "#ec4899"];

function settlementLabel(model: number | undefined) {
  if (model === 1) return "CPC";
  if (model === 2) return "CPM";
  return model != null ? `Model #${model}` : "—";
}

export default function StudioCampaignDetailPage() {
  const params = useParams();
  const rawId = decodeURIComponent(String(params.chainCampaignId ?? ""));
  const idNum = Number(rawId);
  const idOk = Number.isFinite(idNum) && idNum >= 1;
  const { address } = useAccount();

  const [row, setRow] = useState<CampaignRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!rawId) {
      setRow(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr("");
    void (async () => {
      try {
        const doc = await getJson<CampaignRow>(`/api/campaigns/${encodeURIComponent(rawId)}`);
        setRow(doc);
      } catch {
        setErr("Not found or API unreachable.");
        setRow(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [rawId]);

  const { data: onchain, error: chainErr } = useReadContracts({
    contracts:
      idOk && CONTRACTS_CONFIGURED
        ? [
            {
              address: CONTRACTS.registry,
              abi: registryAbi,
              functionName: "campaignHoster" as const,
              args: [BigInt(idNum)] as const,
            },
            {
              address: CONTRACTS.registry,
              abi: registryAbi,
              functionName: "getCampaignFunding" as const,
              args: [BigInt(idNum)] as const,
            },
            {
              address: CONTRACTS.registry,
              abi: registryAbi,
              functionName: "getPublicInfo" as const,
              args: [BigInt(idNum)] as const,
            },
            {
              address: CONTRACTS.registry,
              abi: registryAbi,
              functionName: "getSettlementTerms" as const,
              args: [BigInt(idNum)] as const,
            },
          ]
        : [],
    query: { enabled: idOk && CONTRACTS_CONFIGURED },
  });

  const hoster = onchain?.[0]?.result as `0x${string}` | undefined;
  const funding = onchain?.[1]?.result as readonly [bigint, bigint, bigint] | undefined;
  const pub = onchain?.[2]?.result as readonly [string, string, boolean] | undefined;
  const terms = onchain?.[3]?.result as readonly [number, bigint] | undefined;

  const isHoster = Boolean(address && hoster && address.toLowerCase() === hoster.toLowerCase());

  const fundingBar = useMemo(() => {
    if (!funding) return [];
    const [available, totalFunded, totalSettled] = funding;
    return [
      {
        name: `Campaign #${idNum}`,
        available: Number(formatEther(available)),
        settled: Number(formatEther(totalSettled)),
        funded: Number(formatEther(totalFunded)),
      },
    ];
  }, [funding, idNum]);

  const fundingPie = useMemo(() => {
    if (!funding) return [];
    const [, totalFunded, totalSettled] = funding;
    const funded = Number(formatEther(totalFunded));
    const settled = Number(formatEther(totalSettled));
    const remaining = Math.max(funded - settled, 0);
    const parts = [
      { name: "Settled (wei trail)", value: settled },
      { name: "Not yet settled (approx.)", value: remaining },
    ];
    return parts.filter((p) => p.value > 0);
  }, [funding]);

  const timelineArea = useMemo(() => {
    if (!funding) return [];
    const settled = Number(formatEther(funding[2]));
    const created = row?.createdAt ? new Date(String(row.createdAt)).getTime() : null;
    const t0 = created && Number.isFinite(created) ? created : Date.now() - 86400000 * 30;
    const t1 = Date.now();
    return [
      { label: "Start", t: t0, settled: 0 },
      { label: "Now", t: t1, settled },
    ];
  }, [funding, row?.createdAt]);

  if (loading) {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  if (!idOk) {
    return (
      <GlassPanel className="p-6">
        <p className="text-muted">Invalid campaign id.</p>
        <Link href="/app/studio/campaigns" className="mt-4 inline-block text-sm text-accent hover:underline">
          ← Your campaigns
        </Link>
      </GlassPanel>
    );
  }

  const chainTitle = pub?.[0] ?? "";
  const chainCategory = pub?.[1] ?? "";
  const chainActive = pub?.[2];
  const rateWei = terms?.[1];

  const displayTitle = (row?.title ? String(row.title) : chainTitle) || `Campaign #${rawId}`;
  const displayCategory = row?.category ? String(row.category) : chainCategory || "—";

  return (
    <div className="space-y-6">
      <Link href="/app/studio/campaigns" className="text-sm text-accent hover:underline">
        ← Your campaigns
      </Link>

      {!row && err ? (
        <GlassPanel className="border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-sm text-amber-100">{err}</p>
          <p className="mt-1 text-xs text-muted">
            API metadata is missing — charts below still use the registry for this id if it exists.
          </p>
        </GlassPanel>
      ) : null}

      <header>
        <p className="font-mono text-xs text-muted">#{String(row?.chainCampaignId ?? rawId)}</p>
        <h1 className="font-display text-2xl font-bold text-[var(--text)] md:text-3xl">{displayTitle}</h1>
        <p className="mt-2 text-sm text-muted">
          {displayCategory}
          {row ? (
            <>
              {" "}
              · API: {String(row.pricingModel ?? "—")} · rate {String(row.rate ?? "—")}
            </>
          ) : null}
          {typeof chainActive === "boolean" ? ` · on-chain ${chainActive ? "active" : "paused"}` : null}
        </p>
        {isHoster ? (
          <p className="mt-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
            You are the registered hoster for this campaign — funding and settlement charts reflect your registry view.
          </p>
        ) : address && hoster ? (
          <p className="mt-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            Connected wallet is not the on-chain hoster. Charts are read-only public registry data.
          </p>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassPanel className="space-y-3 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Use case & copy</p>
          {row ? (
            <>
              <p className="text-sm text-muted">
                <strong className="text-[var(--text)]">Advertiser</strong> {String(row.advertiser ?? hoster ?? "—")}
              </p>
              <p className="text-sm text-muted">
                <strong className="text-[var(--text)]">Creative</strong>{" "}
                <span className="break-all font-mono text-xs">{String(row.creativeURI ?? "—")}</span>
              </p>
              <div>
                <p className="text-xs font-semibold uppercase text-muted">Description</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted">{String(row.description ?? "")}</p>
              </div>
              {row.createdAt ? <p className="text-xs text-muted">Synced {new Date(String(row.createdAt)).toLocaleString()}</p> : null}
            </>
          ) : (
            <p className="text-sm text-muted">
              Sync this campaign from Studio after creation so title, links, and description appear here for publishers.
            </p>
          )}
        </GlassPanel>

        <GlassPanel className="space-y-3 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">On-chain snapshot</p>
          {!CONTRACTS_CONFIGURED ? (
            <p className="text-sm text-muted">Contracts are not configured in this build.</p>
          ) : chainErr ? (
            <p className="text-sm text-red-300">Could not read registry: {chainErr.message}</p>
          ) : !onchain ? (
            <p className="text-sm text-muted">Loading chain data…</p>
          ) : (
            <ul className="space-y-2 text-sm text-muted">
              <li>
                <span className="text-[var(--text)]">Hoster</span>{" "}
                <span className="font-mono text-xs">{hoster ?? "—"}</span>
              </li>
              <li>
                <span className="text-[var(--text)]">Public title / category</span> {chainTitle || "—"} · {chainCategory || "—"}
              </li>
              <li>
                <span className="text-[var(--text)]">Settlement</span> {settlementLabel(terms?.[0])}{" "}
                {rateWei != null ? (
                  <span className="font-mono text-xs"> · {formatEther(rateWei)} ETH unit</span>
                ) : null}
              </li>
              {funding ? (
                <li>
                  <span className="text-[var(--text)]">Funding handles</span> available {formatEther(funding[0])} · funded{" "}
                  {formatEther(funding[1])} · settled {formatEther(funding[2])} (tFHE labels mirror Account)
                </li>
              ) : (
                <li>No funding tuple — id may be out of range for this registry.</li>
              )}
            </ul>
          )}
        </GlassPanel>
      </div>

      {CONTRACTS_CONFIGURED && funding && (
        <div className="grid gap-6 lg:grid-cols-2">
          <GlassPanel className="p-5">
            <p className="mb-3 text-xs font-semibold uppercase text-muted">Bar — available vs settled vs funded</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={fundingBar}>
                <CartesianGrid strokeDasharray="3 3" stroke="#33415555" />
                <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="available" fill={CHART_COLORS[0]!} name="Available" />
                <Bar dataKey="settled" fill={CHART_COLORS[2]!} name="Settled" />
                <Bar dataKey="funded" fill={CHART_COLORS[1]!} name="Total funded" />
              </BarChart>
            </ResponsiveContainer>
          </GlassPanel>
          <GlassPanel className="p-5">
            <p className="mb-3 text-xs font-semibold uppercase text-muted">Pie — settled vs remainder of funded</p>
            {fundingPie.length === 0 ? (
              <p className="text-sm text-muted">Not enough non-zero values to chart.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={fundingPie} dataKey="value" nameKey="name" outerRadius={90} label>
                    {fundingPie.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]!} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </GlassPanel>
          <GlassPanel className="p-5 lg:col-span-2">
            <p className="mb-3 text-xs font-semibold uppercase text-muted">Area — settled growth (API sync → now)</p>
            <p className="mb-2 text-xs text-muted">
              Impression/click counts live in encrypted analytics handles; this curve uses public settled totals at sync time vs now.
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={timelineArea}>
                <CartesianGrid strokeDasharray="3 3" stroke="#33415555" />
                <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="settled" stroke={CHART_COLORS[0]!} fill={CHART_COLORS[0]!} fillOpacity={0.25} name="Settled (ETH)" />
              </AreaChart>
            </ResponsiveContainer>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
