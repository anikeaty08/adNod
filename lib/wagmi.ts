import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { adnodeChain } from "@/lib/chain";

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

export const wagmiConfig = getDefaultConfig({
  appName: "Cipher DeFi",
  projectId,
  chains: [adnodeChain],
  transports: {
    [adnodeChain.id]: http(rpcUrl),
  },
  // Prevent WalletConnect storage from executing during Next.js build/SSR.
  ssr: false,
});
