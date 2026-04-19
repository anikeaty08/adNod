"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatEther, type Abi } from "viem";
import {
  useAccount,
  useReadContract,
  useSimulateContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { GlassPanel } from "@/components/ui/glass-panel";
import { PrimaryButton } from "@/components/ui/primary-button";
import { CONTRACTS, CONTRACTS_CONFIGURED, adRegistryAbi, payoutWrapperAbi } from "@/lib/contracts";
import { adnodeChain } from "@/lib/chain";
import { useOverlay } from "@/components/providers/overlay-provider";

const registryAbi = adRegistryAbi as Abi;
const wrapperAbi = payoutWrapperAbi as Abi;
const FALLBACK_STEP_WEI = 1_000_000_000_000n; // 1e12 (used only if wrapper rate() is unavailable)

function formatError(err: unknown) {
  if (!err) return "";
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.toLowerCase().includes("no earnings")) return "No claimable balance.";
  if (msg.toLowerCase().includes("below")) return "Claimable amount is below the minimum step.";
  if (msg.toLowerCase().includes("rpc")) return "RPC error. Try again or switch RPC.";
  return msg;
}

export default function PublisherEarningsPage() {
  const overlay = useOverlay();
  const { address } = useAccount();
  const claimAmountWeiRef = useRef<bigint>(0n);
  const [localErr, setLocalErr] = useState("");

  const { data: claimable, refetch: refetchClaimable } = useReadContract({
    address: CONTRACTS.registry,
    abi: registryAbi,
    functionName: "claimableEarnings",
    args: [(address ?? "0x0000000000000000000000000000000000000000") as `0x${string}`],
    query: { enabled: Boolean(CONTRACTS_CONFIGURED && address) },
  });

  const { data: wrapperRate } = useReadContract({
    address: CONTRACTS.payoutWrapper,
    abi: wrapperAbi,
    functionName: "rate",
    query: { enabled: Boolean(CONTRACTS_CONFIGURED) },
  });

  const claimableWei = (claimable ?? 0n) as bigint;
  const stepWei = ((wrapperRate ?? FALLBACK_STEP_WEI) as bigint) || FALLBACK_STEP_WEI;
  const alignedWei = claimableWei >= stepWei ? claimableWei - (claimableWei % stepWei) : 0n;
  const hasDust = claimableWei >= stepWei && claimableWei % stepWei !== 0n;
  const canWithdraw = claimableWei > 0n && claimableWei >= stepWei && claimableWei % stepWei === 0n;

  const { data: claimSim } = useSimulateContract({
    address: CONTRACTS.registry,
    abi: registryAbi,
    functionName: "claimMyEarnings",
    account: address,
    query: { enabled: Boolean(CONTRACTS_CONFIGURED && address && canWithdraw) },
  });

  const claimRequest = claimSim?.request;

  const { writeContract, data: claimHash, isPending: claimSending, error: claimErr } = useWriteContract();
  const { isLoading: claimConfirming, isSuccess: claimSuccess } = useWaitForTransactionReceipt({
    hash: claimHash,
  });

  useEffect(() => {
    if (claimSending || claimConfirming) overlay.showMoney();
    else overlay.hide();
  }, [claimSending, claimConfirming, overlay]);

  useEffect(() => {
    if (!claimSuccess || !claimHash) return;
    void refetchClaimable();
  }, [claimSuccess, claimHash, refetchClaimable]);

  const explorerTxBase = adnodeChain.blockExplorers?.default.url
    ? `${adnodeChain.blockExplorers.default.url.replace(/\/$/, "")}/tx/`
    : "";

  const status = useMemo(() => {
    if (!address) return "Connect your wallet to see earnings.";
    if (!CONTRACTS_CONFIGURED) return "Contracts are not configured for this build.";
    if (claimableWei === 0n) return "No claimable earnings yet.";
    if (canWithdraw) return "Ready to withdraw.";
    if (claimableWei < stepWei) return "Earnings are below the minimum withdraw step.";
    if (hasDust) return "Earnings include dust. Only aligned amounts can be withdrawn.";
    return "Earnings are not withdrawable yet.";
  }, [address, claimableWei, canWithdraw, stepWei, hasDust]);

  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text)] md:text-3xl">Earnings</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">Withdraw claimable earnings to your wallet when the on-chain step aligns.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassPanel className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Claimable</p>
          <p className="mt-2 font-display text-3xl font-bold text-[var(--text)]">{address ? `${formatEther(claimableWei)} ETH` : "—"}</p>
          <p className="mt-2 text-sm text-muted">{status}</p>

          <div className="mt-4 grid gap-2 text-sm text-muted">
            <p>
              <span className="text-[var(--text)]">Minimum step</span>: <span className="font-mono">{formatEther(stepWei)} ETH</span>
            </p>
            {hasDust ? (
              <p>
                <span className="text-[var(--text)]">Withdrawable now</span>:{" "}
                <span className="font-mono">{formatEther(alignedWei)} ETH</span>
              </p>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <PrimaryButton
              disabled={!claimRequest || claimSending || claimConfirming}
              onClick={() => {
                setLocalErr("");
                if (!claimRequest) return;
                claimAmountWeiRef.current = claimableWei;
                try {
                  writeContract(claimRequest);
                } catch (e) {
                  setLocalErr(formatError(e));
                }
              }}
            >
              {claimSending || claimConfirming ? "Withdrawing..." : "Withdraw earnings"}
            </PrimaryButton>
            {claimHash && explorerTxBase ? (
              <a className="text-sm text-accent hover:underline" href={`${explorerTxBase}${claimHash}`} target="_blank" rel="noreferrer">
                View tx
              </a>
            ) : null}
          </div>

          {claimErr ? <p className="mt-3 text-sm text-red-200">{formatError(claimErr)}</p> : null}
          {localErr ? <p className="mt-3 text-sm text-red-200">{localErr}</p> : null}
        </GlassPanel>

        <GlassPanel className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">What counts as an earning?</p>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted">
            <li>Impressions only count after the ad is viewable for ~5 seconds.</li>
            <li>Clicks count when a user clicks the ad.</li>
            <li>Settlement posts to the chain, then earnings become claimable.</li>
          </ul>
          <p className="mt-4 text-xs text-muted">
            If you see claimable balance but withdraw is disabled, it usually means the amount is not aligned to the wrapper step yet.
          </p>
        </GlassPanel>
      </div>
    </div>
  );
}

