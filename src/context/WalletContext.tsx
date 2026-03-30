import { createContext, useContext, useMemo, useState } from "react";
import { connectFhenixWallet } from "@/lib/fhenix-contract";

interface WalletState {
  address: string | null;
  network: string | null;
  connected: boolean;
  connect: () => Promise<void>;
}

const WalletContext = createContext<WalletState | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);

  const value = useMemo(
    () => ({
      address,
      network,
      connected: Boolean(address),
      connect: async () => {
        const wallet = await connectFhenixWallet();
        setAddress(wallet.address);
        setNetwork(wallet.network);
      },
    }),
    [address, network],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used within WalletProvider");
  return context;
}
