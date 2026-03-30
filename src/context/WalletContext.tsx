import { createContext, useContext, useMemo, useState } from "react";
import { connectFhenixWallet } from "@/lib/fhenix-contract";

interface WalletState {
  address: string | null;
  network: string | null;
  connected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
}

const WalletContext = createContext<WalletState | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const value = useMemo(
    () => ({
      address,
      network,
      connected: Boolean(address),
      isConnecting,
      error,
      connect: async () => {
        setIsConnecting(true);
        setError(null);
        try {
          const wallet = await connectFhenixWallet();
          setAddress(wallet.address);
          setNetwork(wallet.network);
        } catch (walletError) {
          setError(walletError instanceof Error ? walletError.message : "Wallet connection failed.");
        } finally {
          setIsConnecting(false);
        }
      },
    }),
    [address, error, isConnecting, network],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used within WalletProvider");
  return context;
}
