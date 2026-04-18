"use client";

import { useMemo } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { ADNODE_CHAIN_ID } from "@/lib/chain";
import styles from "@/styles/guard.module.css";

export function NetworkGuard({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { chains, switchChain, isPending } = useSwitchChain();

  const wrongChain = isConnected && chainId !== ADNODE_CHAIN_ID;
  const target = useMemo(() => chains.find((chain) => chain.id === ADNODE_CHAIN_ID), [chains]);

  if (!wrongChain) return <>{children}</>;

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <p className={styles.label}>Wrong network</p>
        <h2>Switch to Arbitrum Sepolia</h2>
        <p>This app is chain-locked. Please switch to continue.</p>
        <button
          className={styles.cta}
          disabled={!target || isPending}
          onClick={() => target && switchChain({ chainId: target.id })}
        >
          {isPending ? "Switching..." : "Switch Network"}
        </button>
      </div>
    </div>
  );
}
