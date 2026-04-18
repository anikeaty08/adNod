"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  useAccount,
  useChainId,
  useReadContract,
  useReadContracts,
  useSimulateContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { formatEther, type Abi } from "viem";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CONTRACTS, CONTRACTS_CONFIGURED, adRegistryAbi, payoutWrapperAbi } from "@/lib/contracts";
import { ScrambleNumber } from "@/components/ui/scramble-number";
import { appendTxLog, readTxLog, type TxLogEntry } from "@/lib/tx-log";
import { useOverlay } from "@/components/providers/overlay-provider";

const registryAbi = adRegistryAbi as Abi;
const wrapperAbi = payoutWrapperAbi as Abi;

/** Default: 18-dec native → 6-dec confidential in FHERC20NativeWrapper (`rate` = 1e12 wei per step). */
const FALLBACK_SHIELD_RATE_WEI = 1_000_000_000_000n;

function formatViemWriteError(err: unknown): string {
  if (!err || typeof err !== "object") return String(err);
  const e = err as { shortMessage?: string; message?: string; cause?: unknown };
  const parts = [e.shortMessage, e.message].filter(Boolean);
  if (e.cause && typeof e.cause === "object") {
    const c = e.cause as { data?: string; message?: string; shortMessage?: string };
    if (c.message) parts.push(c.message);
    if (c.shortMessage) parts.push(c.shortMessage);
  }
  const joined = parts.join(" ").toLowerCase();
  if (joined.includes("internal json-rpc")) {
    return "The RPC could not complete the transaction. For withdrawals, the balance usually must be a whole multiple of the minimum step shown in Account.";
  }
  if (joined.includes("amounttoosmall") || joined.includes("too small for confidential")) {
    return (
      "Claim amount is below one confidential native step (see payout wrapper `rate()`, usually 1e12 wei ≈ 0.000001 ETH). " +
      "Wait until claimable is at least that much, or ask the host to settle in aligned wei multiples."
    );
  }
  if (joined.includes("no earnings")) {
    return "No claimable balance (contract: No earnings available).";
  }
  return e.shortMessage || e.message || "Transaction failed.";
}

const MAX_IDS = 400;
const CHART_COLORS = ["#0ea5e9", "#6366f1", "#22c55e", "#f59e0b", "#ec4899", "#a855f7"];

function tfheLabel(wei: bigint) {
  try {
    return `${formatEther(wei)} tFHE`;
  } catch {
    return `${wei.toString()} wei`;
  }
}

type HostCampaign = {
  id: number;
  category: string;
  active: boolean;
  available: bigint;
  totalFunded: bigint;
  totalSettled: bigint;
  settlementModel: number;
  settlementRate: bigint;
};

type DevSlot = {
  id: number;
  siteName: string;
  category: string;
  active: boolean;
  assignedCampaignId: number;
};

export default function AccountPage() {
  const { address } = useAccount();
  const overlay = useOverlay();
  const claimAmountWeiRef = useRef<bigint>(0n);
  const [txLog, setTxLog] = useState<TxLogEntry[]>([]);
  const chainId = useChainId();
  const explorerTxBase =
    chainId === 421614
      ? "https://sepolia.arbiscan.io/tx/"
      : chainId === 8008135
        ? "https://explorer.helium.fhenix.zone/tx/"
        : "https://etherscan.io/tx/";

  const { data: metaResults } = useReadContracts({
    contracts: [
      {
        address: CONTRACTS.registry,
        abi: registryAbi,
        functionName: "nextCampaignId",
      },
      {
        address: CONTRACTS.registry,
        abi: registryAbi,
        functionName: "nextSlotId",
      },
    ],
    query: { enabled: CONTRACTS_CONFIGURED },
  });

  const nextCampaignId = metaResults?.[0]?.result as bigint | undefined;
  const nextSlotId = metaResults?.[1]?.result as bigint | undefined;

  const campaignIdRange = useMemo(() => {
    const next = Number(nextCampaignId ?? 0n);
    const max = next - 1;
    if (!Number.isFinite(max) || max < 1) return [];
    const low = max <= MAX_IDS ? 1 : Math.max(1, max - MAX_IDS + 1);
    const ids: number[] = [];
    for (let i = low; i <= max; i++) ids.push(i);
    return ids;
  }, [nextCampaignId]);

  const slotIdRange = useMemo(() => {
    const next = Number(nextSlotId ?? 0n);
    const max = next - 1;
    if (!Number.isFinite(max) || max < 1) return [];
    const low = max <= MAX_IDS ? 1 : Math.max(1, max - MAX_IDS + 1);
    const ids: number[] = [];
    for (let i = low; i <= max; i++) ids.push(i);
    return ids;
  }, [nextSlotId]);

  const hosterContracts = useMemo(
    () =>
      campaignIdRange.map((id) => ({
        address: CONTRACTS.registry,
        abi: registryAbi,
        functionName: "campaignHoster" as const,
        args: [BigInt(id)] as const,
      })),
    [campaignIdRange],
  );

  const { data: hosterResults } = useReadContracts({
    contracts: hosterContracts,
    query: { enabled: CONTRACTS_CONFIGURED && !!address && hosterContracts.length > 0 },
  });

  const myCampaignIds = useMemo(() => {
    if (!address || !hosterResults) return [];
    const out: number[] = [];
    hosterResults.forEach((row, idx) => {
      const h = row.result as string | undefined;
      if (h && h.toLowerCase() === address.toLowerCase()) {
        const id = campaignIdRange[idx];
        if (id != null) out.push(id);
      }
    });
    return out;
  }, [address, hosterResults, campaignIdRange]);

  const campaignDetailContracts = useMemo(
    () =>
      myCampaignIds.flatMap((id) => [
        {
          address: CONTRACTS.registry,
          abi: registryAbi,
          functionName: "getCampaignFunding" as const,
          args: [BigInt(id)] as const,
        },
        {
          address: CONTRACTS.registry,
          abi: registryAbi,
          functionName: "getPublicInfo" as const,
          args: [BigInt(id)] as const,
        },
        {
          address: CONTRACTS.registry,
          abi: registryAbi,
          functionName: "getSettlementTerms" as const,
          args: [BigInt(id)] as const,
        },
      ]),
    [myCampaignIds],
  );

  const { data: campaignDetails } = useReadContracts({
    contracts: campaignDetailContracts,
    query: { enabled: CONTRACTS_CONFIGURED && campaignDetailContracts.length > 0 },
  });

  const myHostCampaigns: HostCampaign[] = useMemo(() => {
    if (!campaignDetails || myCampaignIds.length === 0) return [];
    const rows: HostCampaign[] = [];
    myCampaignIds.forEach((id, i) => {
      const base = i * 3;
      const funding = campaignDetails[base]?.result as readonly [bigint, bigint, bigint] | undefined;
      const pub = campaignDetails[base + 1]?.result as [string, string, boolean] | undefined;
      const terms = campaignDetails[base + 2]?.result as [number, bigint] | undefined;
      if (!funding || !pub || !terms) return;
      rows.push({
        id,
        category: pub[1],
        active: pub[2],
        available: funding[0],
        totalFunded: funding[1],
        totalSettled: funding[2],
        settlementModel: Number(terms[0]),
        settlementRate: terms[1],
      });
    });
    return rows;
  }, [campaignDetails, myCampaignIds]);

  const slotContracts = useMemo(
    () =>
      slotIdRange.map((id) => ({
        address: CONTRACTS.registry,
        abi: registryAbi,
        functionName: "slots" as const,
        args: [BigInt(id)] as const,
      })),
    [slotIdRange],
  );

  const { data: slotResults } = useReadContracts({
    contracts: slotContracts,
    query: { enabled: CONTRACTS_CONFIGURED && !!address && slotContracts.length > 0 },
  });

  const mySlots: DevSlot[] = useMemo(() => {
    if (!address || !slotResults) return [];
    const out: DevSlot[] = [];
    slotResults.forEach((row, idx) => {
      const tuple = row.result as [string, string, string, boolean, bigint] | undefined;
      if (!tuple) return;
      const [developer, siteName, category, active, assignedCampaignId] = tuple;
      if (developer.toLowerCase() !== address.toLowerCase()) return;
      const sid = slotIdRange[idx];
      if (sid == null) return;
      out.push({
        id: sid,
        siteName,
        category,
        active,
        assignedCampaignId: Number(assignedCampaignId),
      });
    });
    return out;
  }, [address, slotResults, slotIdRange]);

  const { data: claimable, refetch: refetchClaimable } = useReadContract({
    address: CONTRACTS.registry,
    abi: registryAbi,
    functionName: "claimableEarnings",
    args: [(address ?? "0x0000000000000000000000000000000000000000") as `0x${string}`],
    query: { enabled: CONTRACTS_CONFIGURED && !!address },
  });

  const claimableWei = (claimable ?? 0n) as bigint;

  const { data: shieldRateWei } = useReadContract({
    address: CONTRACTS.payoutWrapper,
    abi: wrapperAbi,
    functionName: "rate",
    query: { enabled: CONTRACTS_CONFIGURED && CONTRACTS.payoutWrapper !== "0x0000000000000000000000000000000000000000" },
  });

  const shieldStepWei = (shieldRateWei ?? FALLBACK_SHIELD_RATE_WEI) as bigint;
  const claimableHasDust = claimableWei >= shieldStepWei && claimableWei % shieldStepWei !== 0n;
  const alignedClaimableWei = claimableWei >= shieldStepWei ? claimableWei - (claimableWei % shieldStepWei) : 0n;
  /** Withdraw only when a full shield step can be executed (avoids generic RPC reverts). */
  const canWithdraw =
    claimableWei > 0n && claimableWei >= shieldStepWei && claimableWei % shieldStepWei === 0n;

  const {
    data: claimSim,
    error: claimSimError,
    isFetching: claimSimLoading,
  } = useSimulateContract({
    address: CONTRACTS.registry,
    abi: registryAbi,
    functionName: "claimMyEarnings",
    account: address,
    query: {
      enabled: Boolean(CONTRACTS_CONFIGURED && address && canWithdraw),
    },
  });

  const claimRequest = claimSim?.request;
  const withdrawReady = Boolean(canWithdraw && claimRequest);

  const { writeContract, data: claimHash, isPending: claimSending, error: claimErr } = useWriteContract();
  const { isLoading: claimConfirming, isSuccess: claimSuccess } = useWaitForTransactionReceipt({
    hash: claimHash,
  });

  useEffect(() => {
    setTxLog(readTxLog());
  }, []);

  useEffect(() => {
    if (claimSending || claimConfirming) overlay.showMoney();
    else overlay.hide();
  }, [claimSending, claimConfirming, overlay]);

  useEffect(() => {
    if (!claimSuccess || !claimHash) return;
    const wei = claimAmountWeiRef.current;
    appendTxLog({
      kind: "claim",
      hash: claimHash,
      label: "Claim earnings",
      amountEth: wei > 0n ? formatEther(wei) : undefined,
    });
    setTxLog(readTxLog());
    void refetchClaimable();
  }, [claimSuccess, claimHash, refetchClaimable]);

  const hostBarData = useMemo(
    () =>
      myHostCampaigns.map((c) => ({
        name: `#${c.id}`,
        available: Number(formatEther(c.available)),
        settled: Number(formatEther(c.totalSettled)),
      })),
    [myHostCampaigns],
  );

  const hostLineData = hostBarData;

  const hostAreaData = useMemo(() => {
    let cumulative = 0;
    return myHostCampaigns.map((c) => {
      cumulative += Number(formatEther(c.totalSettled));
      return { name: `#${c.id}`, settledRunning: cumulative };
    });
  }, [myHostCampaigns]);

  const hostPieStatus = useMemo(() => {
    let active = 0;
    let paused = 0;
    for (const c of myHostCampaigns) {
      if (c.active) active += 1;
      else paused += 1;
    }
    return [
      { name: "Active", value: active },
      { name: "Paused", value: paused },
    ].filter((x) => x.value > 0);
  }, [myHostCampaigns]);

  const hostPieSpend = useMemo(() => {
    return myHostCampaigns.map((c) => ({
      name: `#${c.id}`,
      value: Number(formatEther(c.totalSettled)),
    }));
  }, [myHostCampaigns]);

  const devSlotPie = useMemo(() => {
    let assigned = 0;
    let open = 0;
    for (const s of mySlots) {
      if (s.assignedCampaignId > 0) assigned += 1;
      else open += 1;
    }
    return [
      { name: "Assigned slot", value: assigned },
      { name: "Unassigned", value: open },
    ].filter((x) => x.value > 0);
  }, [mySlots]);

  const categoryCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of mySlots) {
      const k = s.category || "—";
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()].map(([name, count]) => ({ name, count }));
  }, [mySlots]);

  const devBarPayments = useMemo(
    () => [{ label: "Claimable now", tfhe: Number(formatEther(claimableWei)) }],
    [claimableWei],
  );

  const monthlyWithdrawals = useMemo(() => {
    const now = new Date();
    const rows: { key: string; label: string; eth: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      rows.push({
        key,
        label: d.toLocaleString(undefined, { month: "short", year: "2-digit" }),
        eth: 0,
      });
    }
    for (const t of txLog) {
      if (t.kind !== "claim" || !t.amountEth) continue;
      const d = new Date(t.at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const row = rows.find((x) => x.key === key);
      if (row) row.eth += Number.parseFloat(t.amountEth) || 0;
    }
    return rows;
  }, [txLog]);

  const monthlyWithdrawalsCumulative = useMemo(() => {
    let cumulative = 0;
    return monthlyWithdrawals.map((r) => {
      cumulative += r.eth;
      return { ...r, cumulative };
    });
  }, [monthlyWithdrawals]);

  const remainderWei = shieldStepWei > 0n ? claimableWei % shieldStepWei : 0n;

  const truncatedCampaigns =
    nextCampaignId != null && Number(nextCampaignId) - 1 > MAX_IDS ? `Showing latest ${MAX_IDS} campaigns by id.` : null;
  const truncatedSlots =
    nextSlotId != null && Number(nextSlotId) - 1 > MAX_IDS ? `Showing latest ${MAX_IDS} slots by id.` : null;

  if (!CONTRACTS_CONFIGURED) {
    return (
      <section style={{ padding: "2rem 0" }}>
        <h1>Account</h1>
        <div className="panel" style={{ marginTop: "1rem" }}>
          <p>Contracts are not configured for this build.</p>
          <p style={{ color: "var(--muted)", marginTop: "0.75rem" }}>
            Set <code>NEXT_PUBLIC_AD_REGISTRY_ADDRESS</code>, <code>NEXT_PUBLIC_AD_ANALYTICS_ADDRESS</code>, and{" "}
            <code>NEXT_PUBLIC_PAYOUT_WRAPPER_ADDRESS</code> (or fill <code>deployments/fhenixArbitrumSepolia.json</code> — default — or{" "}
            <code>deployments/fhenixHelium.json</code> with <code>NEXT_PUBLIC_ADNODE_NETWORK=fhenixHelium</code>).
          </p>
        </div>
      </section>
    );
  }

  return (
    <section style={{ padding: "2rem 0" }}>
      <h1>Account</h1>
      <p style={{ color: "var(--muted)", maxWidth: 640, marginTop: "0.5rem" }}>
        On-chain snapshot for your wallet: campaigns you host, slots you publish, and developer claimable balance. Finance values can be masked; withdrawals require a minimum aligned amount.
      </p>

      {!address ? (
        <div className="panel" style={{ marginTop: "1.5rem" }}>
          <p>Connect a wallet to load your hoster and developer data.</p>
        </div>
      ) : (
        <>
          {truncatedCampaigns && (
            <p style={{ color: "#f59e0b", marginTop: "1rem", fontSize: "0.9rem" }}>{truncatedCampaigns}</p>
          )}
          {truncatedSlots && (
            <p style={{ color: "#f59e0b", marginTop: "0.5rem", fontSize: "0.9rem" }}>{truncatedSlots}</p>
          )}

          <div style={{ display: "grid", gap: "2rem", marginTop: "2rem" }}>
            <div className="panel">
              <h2 style={{ marginTop: 0 }}>Advertiser</h2>
              <p style={{ color: "var(--muted)" }}>
                Campaigns you host on-chain (latest ids scanned):{" "}
                {myHostCampaigns.length === 0 ? "none in this window." : `${myHostCampaigns.length} found.`}
              </p>
              {myHostCampaigns.length > 0 && (
                <ul style={{ margin: "1rem 0", paddingLeft: "1.25rem", color: "var(--muted)" }}>
                  {myHostCampaigns.map((c) => (
                    <li key={c.id} style={{ marginBottom: "0.35rem" }}>
                      Campaign #{c.id} · {c.category} · {c.active ? "active" : "paused"} · available {tfheLabel(c.available)}{" "}
                      · settled {tfheLabel(c.totalSettled)}
                    </li>
                  ))}
                </ul>
              )}

              {myHostCampaigns.length > 0 && (
                <div style={{ display: "grid", gap: "1.5rem", marginTop: "1.5rem" }}>
                  <ChartCard title="Bar — available vs settled (tFHE)">
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={hostBarData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#33415555" />
                        <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                        <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="available" fill={CHART_COLORS[0]!} name="Available" />
                        <Bar dataKey="settled" fill={CHART_COLORS[2]!} name="Settled" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard title="Line — same totals (alternate view)">
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={hostLineData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#33415555" />
                        <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                        <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="available" stroke={CHART_COLORS[0]!} name="Available" dot />
                        <Line type="monotone" dataKey="settled" stroke={CHART_COLORS[1]!} name="Settled" dot />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <ChartCard title="Area — cumulative settled across your campaigns">
                    <ResponsiveContainer width="100%" height={240}>
                      <AreaChart data={hostAreaData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#33415555" />
                        <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                        <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="settledRunning" stroke={CHART_COLORS[0]!} fill={CHART_COLORS[0]!} fillOpacity={0.3} name="Cumulative settled" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
                    <ChartCard title="Pie — active vs paused">
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={hostPieStatus} dataKey="value" nameKey="name" outerRadius={70} label>
                            {hostPieStatus.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]!} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartCard>
                    <ChartCard title="Pie — settled share by campaign">
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={hostPieSpend} dataKey="value" nameKey="name" outerRadius={70} label>
                            {hostPieSpend.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]!} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </ChartCard>
                  </div>
                </div>
              )}
            </div>

            <div className="panel">
              <h2 style={{ marginTop: 0 }}>Publisher</h2>
              <p style={{ color: "var(--muted)" }}>
                Slots you registered (latest ids scanned): {mySlots.length === 0 ? "none in this window." : `${mySlots.length} found.`}
              </p>

              <div style={{ marginTop: "1rem" }}>
                <p style={{ color: "var(--muted)" }}>Developer claimable</p>
                <p style={{ fontSize: "1.35rem" }}>
                  <ScrambleNumber value={formatEther(claimableWei)} /> <span style={{ color: "var(--muted)" }}>tFHE</span>
                </p>
                <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginTop: "0.5rem", maxWidth: 520 }}>
                  Minimum one withdrawal: <strong style={{ color: "#e2e8f0" }}>{formatEther(shieldStepWei)} ETH</strong>{" "}
                  and your balance must be a <strong style={{ color: "#e2e8f0" }}>whole multiple</strong> of that step.
                </p>
                <p style={{ color: "var(--muted)", fontSize: "0.78rem", marginTop: "0.35rem", fontFamily: "ui-monospace, monospace" }}>
                  Raw wei: {claimableWei.toString()} · step {shieldStepWei.toString()} · remainder {remainderWei.toString()}
                </p>
                {!canWithdraw && claimableWei > 0n ? (
                  <p style={{ color: "#fbbf24", marginTop: "0.65rem", fontSize: "0.88rem" }}>
                    {claimableWei < shieldStepWei
                      ? `Below minimum — accrue at least ${formatEther(shieldStepWei)} ETH claimable before withdrawing.`
                      : "Balance has a remainder — wait for settlements in aligned wei multiples, then try again."}
                  </p>
                ) : null}
                {claimableHasDust && !canWithdraw ? (
                  <p style={{ color: "var(--muted)", marginTop: "0.5rem", fontSize: "0.85rem" }}>
                    Next aligned amount would be ~{formatEther(alignedClaimableWei)} ETH; the rest stays until more earnings align to the step.
                  </p>
                ) : null}
                {canWithdraw && !claimRequest && !claimSimLoading ? (
                  <p style={{ color: "#fbbf24", marginTop: "0.65rem", fontSize: "0.88rem", maxWidth: 560 }}>
                    On-chain preview of <code style={{ color: "#e2e8f0" }}>claimMyEarnings</code> failed (RPC or revert). Try another RPC,
                    confirm you are on the correct network, or wait until the registry agrees the claimable amount is withdrawable.
                  </p>
                ) : null}
                {claimSimError && canWithdraw ? (
                  <p style={{ color: "#f87171", marginTop: "0.5rem", fontSize: "0.82rem", maxWidth: 560 }}>
                    {formatViemWriteError(claimSimError)}
                  </p>
                ) : null}

                <button
                  type="button"
                  className="panel"
                  style={{
                    marginTop: "1rem",
                    padding: "0.65rem 1.25rem",
                    borderRadius: 999,
                    border: "1px solid rgba(14,165,233,0.45)",
                    background: "rgba(14,165,233,0.15)",
                    color: "#e0f2fe",
                    fontWeight: 700,
                    cursor: !withdrawReady || claimSending || claimConfirming || claimSimLoading ? "not-allowed" : "pointer",
                    opacity: !withdrawReady ? 0.45 : 1,
                  }}
                  disabled={!withdrawReady || claimSending || claimConfirming || claimSimLoading}
                  onClick={() => {
                    if (!claimRequest) return;
                    claimAmountWeiRef.current = claimableWei;
                    writeContract(claimRequest);
                  }}
                >
                  {claimSimLoading
                    ? "Checking…"
                    : claimSending || claimConfirming
                      ? "Withdrawing…"
                      : "Withdraw earnings"}
                </button>
                {claimErr && (
                  <p style={{ color: "#f87171", marginTop: "0.75rem", fontSize: "0.9rem" }}>{formatViemWriteError(claimErr)}</p>
                )}
                {claimHash && (
                  <p style={{ marginTop: "0.75rem", fontSize: "0.85rem" }}>
                    <a href={`${explorerTxBase}${claimHash}`} target="_blank" rel="noreferrer" style={{ color: "#38bdf8" }}>
                      View transaction
                    </a>
                  </p>
                )}

                {txLog.filter((t) => t.kind === "claim").length > 0 ? (
                  <div style={{ marginTop: "1.25rem" }}>
                    <p style={{ color: "var(--muted)", fontSize: "0.8rem", marginBottom: "0.35rem" }}>Credited withdrawals (this device)</p>
                    <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "var(--muted)", fontSize: "0.82rem" }}>
                      {txLog
                        .filter((t) => t.kind === "claim")
                        .slice(0, 8)
                        .map((t) => (
                          <li key={t.id} style={{ marginBottom: "0.25rem" }}>
                            <a href={`${explorerTxBase}${t.hash}`} target="_blank" rel="noreferrer" style={{ color: "#38bdf8" }}>
                              {t.hash.slice(0, 10)}…
                            </a>{" "}
                            · {new Date(t.at).toLocaleDateString()}
                          </li>
                        ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              <div style={{ marginTop: "1.5rem" }}>
                <ChartCard title="Bar — claimable balance">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={devBarPayments}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#33415555" />
                      <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="tfhe" fill={CHART_COLORS[2]!} name="tFHE" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
                <ChartCard title="Composed — withdrawals by month (this device, logged on success)">
                  <p style={{ margin: "0 0 0.75rem", fontSize: "0.78rem", color: "var(--muted)" }}>
                    Bars are per-month totals from your local tx log; the line is cumulative over the last 12 months.
                  </p>
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={monthlyWithdrawalsCumulative}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#33415555" />
                      <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => String(v)} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="eth" fill={CHART_COLORS[0]!} name="Month (ETH)" radius={[4, 4, 0, 0]} />
                      <Line
                        type="monotone"
                        dataKey="cumulative"
                        stroke={CHART_COLORS[4]!}
                        strokeWidth={2}
                        dot={false}
                        name="Cumulative (ETH)"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              {mySlots.length > 0 && (
                <>
                  <ul style={{ margin: "1rem 0", paddingLeft: "1.25rem", color: "var(--muted)" }}>
                    {mySlots.map((s) => (
                      <li key={s.id} style={{ marginBottom: "0.35rem" }}>
                        Slot #{s.id} · {s.siteName} · {s.category} · {s.active ? "active" : "inactive"} · assignment{" "}
                        {s.assignedCampaignId > 0 ? `#${s.assignedCampaignId}` : "—"}
                      </li>
                    ))}
                  </ul>

                  <div style={{ display: "grid", gap: "1.5rem", marginTop: "1.5rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
                      <ChartCard title="Pie — slot assignment">
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie data={devSlotPie} dataKey="value" nameKey="name" outerRadius={70} label>
                              {devSlotPie.map((_, i) => (
                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]!} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </ChartCard>

                      <ChartCard title="Area — slots per category">
                        <ResponsiveContainer width="100%" height={220}>
                          <AreaChart data={categoryCounts}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#33415555" />
                            <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                            <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} />
                            <Tooltip />
                            <Area type="monotone" dataKey="count" stroke={CHART_COLORS[4]!} fill={CHART_COLORS[4]!} fillOpacity={0.35} name="Slots" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </ChartCard>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ border: "1px solid rgba(148,163,184,0.25)", borderRadius: 16, padding: "1rem", background: "rgba(15,23,42,0.35)" }}>
      <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", color: "#e2e8f0" }}>{title}</h3>
      {children}
    </div>
  );
}
