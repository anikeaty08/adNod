import { createContext, useContext, useMemo } from "react";
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { getNetworkLabel, isWalletConnectEnabled } from "@/lib/contract-client";

interface WalletState {
  address: string | null;
  network: string | null;
  chainId: number | null;
  connected: boolean;
  isConnecting: boolean;
  isWrongNetwork: boolean;
  isWalletConnectReady: boolean;
  error: string | null;
  connectWalletConnect: () => Promise<void>;
  disconnect: () => void;
  switchToArbitrumSepolia: () => Promise<void>;
}

const WalletContext = createContext<WalletState | undefined>(undefined);

function toReadableWalletError(message?: string | null) {
  const normalized = (message || "").toLowerCase();

  if (!message) return null;
  if (normalized.includes("user rejected")) return "Wallet connection was cancelled.";
  if (normalized.includes("project id")) return "WalletConnect is not configured yet. Add VITE_WALLETCONNECT_PROJECT_ID.";
  if (normalized.includes("connector not found")) return "Requested wallet connector is not available.";
  if (normalized.includes("chain")) return "Wallet connected, but the selected network is not the Fhenix-compatible testnet.";

  return message;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectAsync, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();

  const walletConnectConnector = connectors.find(
    (connector) => connector.id === "walletConnect" || connector.name.toLowerCase().includes("walletconnect"),
  );

  const value = useMemo(
    () => ({
      address: address ?? null,
      network: getNetworkLabel(chainId) ? `${getNetworkLabel(chainId)} (Fhenix-compatible)` : null,
      chainId: chainId ?? null,
      connected: isConnected,
      isConnecting: isPending,
      isWrongNetwork: Boolean(isConnected && chainId !== 421614),
      isWalletConnectReady: isWalletConnectEnabled() && Boolean(walletConnectConnector),
      error: toReadableWalletError(error?.message ?? null),
      connectWalletConnect: async () => {
        if (!isWalletConnectEnabled()) {
          throw new Error("WalletConnect is not configured. Add VITE_WALLETCONNECT_PROJECT_ID to your environment.");
        }

        if (!walletConnectConnector) {
          throw new Error("WalletConnect connector is not available.");
        }

        await connectAsync({ connector: walletConnectConnector });
      },
      disconnect,
      switchToArbitrumSepolia: async () => {
        await switchChainAsync({ chainId: 421614 });
      },
    }),
    [address, chainId, connectAsync, disconnect, error?.message, isConnected, isPending, switchChainAsync, walletConnectConnector],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used within WalletProvider");
  return context;
}
