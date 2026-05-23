import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import { adnodeChain, supportedAdNodeChains } from "@/lib/chain";

export function createWagmiConfig() {
  const projectId =
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? process.env.VITE_WALLETCONNECT_PROJECT_ID ?? "";

  if (!projectId) {
    // eslint-disable-next-line no-console
    console.warn("Missing NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID (or VITE_WALLETCONNECT_PROJECT_ID)");
  }

  const rpcUrl =
    process.env.NEXT_PUBLIC_RPC_URL ||
    process.env.VITE_FHENIX_RPC_URL ||
    adnodeChain.rpcUrls.default.http[0];
  const transports = {
    [supportedAdNodeChains[0].id]: http(
      adnodeChain.id === supportedAdNodeChains[0].id ? rpcUrl : supportedAdNodeChains[0].rpcUrls.default.http[0],
    ),
    [supportedAdNodeChains[1].id]: http(
      adnodeChain.id === supportedAdNodeChains[1].id ? rpcUrl : supportedAdNodeChains[1].rpcUrls.default.http[0],
    ),
  };

  return projectId
    ? getDefaultConfig({
        appName: "Cipher DeFi",
        projectId,
        chains: supportedAdNodeChains,
        transports,
        // Prevent WalletConnect storage from executing during Next.js build/SSR.
        ssr: false,
      })
    : createConfig({
        chains: supportedAdNodeChains,
        connectors: [injected()],
        transports,
        ssr: false,
      });
}
