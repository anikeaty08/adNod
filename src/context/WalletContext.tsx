import { createContext, useContext, useMemo } from "react";
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { getNetworkLabel } from "@/lib/contract-client";

interface WalletState {
  address: string | null;
  network: string | null;
  chainId: number | null;
  connected: boolean;
  isConnecting: boolean;
  isWrongNetwork: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToArbitrumSepolia: () => Promise<void>;
}

const WalletContext = createContext<WalletState | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectAsync, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();

  const value = useMemo(
    () => ({
      address: address ?? null,
      network: getNetworkLabel(chainId),
      chainId: chainId ?? null,
      connected: isConnected,
      isConnecting: isPending,
      isWrongNetwork: Boolean(isConnected && chainId !== 421614),
      error: error?.message ?? null,
      connect: async () => {
        if (!connectors.length) throw new Error("No wallet connector available.");
        await connectAsync({ connector: connectors[0] });
      },
      disconnect,
      switchToArbitrumSepolia: async () => {
        await switchChainAsync({ chainId: 421614 });
      },
    }),
    [address, chainId, connectors, connectAsync, disconnect, error?.message, isConnected, isPending, switchChainAsync],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used within WalletProvider");
  return context;
}
