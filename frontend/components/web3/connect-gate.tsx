"use client";

import dynamic from "next/dynamic";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import styles from "@/styles/guard.module.css";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });
const shieldSticker = require("@/public/stickers/shield.json");

export function ConnectGate({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount();
  if (isConnected) return <>{children}</>;

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.sticker}>
          <Lottie animationData={shieldSticker} loop />
        </div>
        <h2>Connect Wallet</h2>
        <p>You need a wallet to access confidential app routes.</p>
        <ConnectButton showBalance={false} />
      </div>
    </div>
  );
}
