import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import App from "@/App";
import "@/styles/globals.css";
import { queryClient } from "@/lib/queryClient";
import { wagmiConfig } from "@/lib/contract-client";
import { ThemeProvider } from "@/context/ThemeContext";
import { WalletProvider } from "@/context/WalletContext";
import { AuthProvider } from "@/context/AuthContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <WalletProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </WalletProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
);
