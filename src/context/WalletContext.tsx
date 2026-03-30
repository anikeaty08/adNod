import { createContext, useContext, useMemo } from "react";
import { useAccount, useChainId, useConnect } from "wagmi";

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
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectAsync, connectors, isPending, error } = useConnect();

  const value = useMemo(
    () => ({
      address: address ?? null,
      network: chainId ? `0x${chainId.toString(16)}` : null,
      connected: isConnected,
      isConnecting: isPending,
      error: error?.message ?? null,
      connect: async () => {
        if (!connectors.length) throw new Error("No wallet connector available.");
        await connectAsync({ connector: connectors[0] });
      },
    }),
    [address, chainId, connectors, connectAsync, error?.message, isConnected, isPending],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used within WalletProvider");
  return context;
}
