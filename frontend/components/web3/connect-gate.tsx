"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { ShieldCheck } from "lucide-react";
import styles from "@/styles/guard.module.css";

export function ConnectGate({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount();
  if (isConnected) return <>{children}</>;

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.sticker}>
          <ShieldCheck size={54} strokeWidth={1.5} />
        </div>
        <h2>Connect Wallet</h2>
        <p>Connect your wallet to create campaigns, manage slots, and withdraw earnings.</p>
        <ConnectButton showBalance={false} />
      </div>
    </div>
  );
}
