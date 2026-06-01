"use client";

import { ReactNode, useMemo } from "react";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { createWagmiConfig } from "@/lib/wagmi";
import { adnodeChain } from "@/lib/chain";
import { AppChrome } from "@/components/app-chrome";
import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient();

export function Web3Providers({ children }: { children: ReactNode }) {
  const wagmiConfig = useMemo(() => createWagmiConfig(), []);
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "var(--accent)",
            accentColorForeground: "var(--bg)",
            borderRadius: "medium",
          })}
          initialChain={adnodeChain}
        >
          <AppChrome>{children}</AppChrome>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
