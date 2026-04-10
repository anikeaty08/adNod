import { QrCode, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { useWallet } from "@/context/WalletContext";
import { truncateMiddle } from "@/lib/utils";

export function WalletConnectionModal() {
  const {
    connected,
    address,
    network,
    connectWalletConnect,
    disconnect,
    error,
    isConnecting,
    isWrongNetwork,
    isWalletConnectReady,
    switchToArbitrumSepolia,
  } = useWallet();

  return (
    <div className="glass-panel rounded-[28px] p-7">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-sky-500/10 p-3 text-sky-600 dark:text-sky-300">
          <Wallet className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-display text-xl font-semibold">Fhenix testnet wallet session</h3>
          <p className="text-sm text-muted-foreground">Use WalletConnect v2 on Arbitrum Sepolia without breaking CoFHE encryption flows.</p>
        </div>
      </div>
      {connected ? (
        <div className="mt-6 rounded-3xl border border-sky-300/60 bg-sky-50/70 p-4 dark:border-sky-500/15 dark:bg-sky-500/10">
          <div className="flex items-center gap-2 text-sm font-medium text-sky-700 dark:text-sky-200">
            <ShieldCheck className="h-4 w-4" />
            Connected to {network}
          </div>
          <p className="mt-2 font-mono text-sm">{truncateMiddle(address ?? "")}</p>
          {isWrongNetwork ? (
            <div className="mt-4 rounded-2xl bg-amber-100/80 px-4 py-3 text-sm text-amber-900 dark:bg-amber-500/15 dark:text-amber-100">
              Wrong network detected. Switch to the Fhenix-compatible Arbitrum Sepolia testnet before signing AdNode transactions.
            </div>
          ) : null}
          {isWrongNetwork ? (
            <Button className="mt-4 w-full" onClick={() => void switchToArbitrumSepolia()}>
              Switch to Fhenix Testnet
            </Button>
          ) : null}
          <Button className="mt-4 w-full" variant="secondary" onClick={() => disconnect()}>
            Disconnect wallet
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-3">
            <Button onClick={() => void connectWalletConnect()} disabled={isConnecting || !isWalletConnectReady}>
              <QrCode className="mr-2 h-4 w-4" />
              {isConnecting ? "Opening WalletConnect..." : "Connect with WalletConnect"}
            </Button>
          </div>
          {!isWalletConnectReady ? (
            <p className="mt-3 text-sm text-amber-600 dark:text-amber-300">WalletConnect needs `VITE_WALLETCONNECT_PROJECT_ID` before the QR modal can open.</p>
          ) : null}
          {error ? <p className="mt-3 text-sm text-rose-500">{error}</p> : null}
        </>
      )}
    </div>
  );
}
