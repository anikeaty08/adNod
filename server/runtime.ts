import { arbitrumSepolia } from "viem/chains";

export const ARBITRUM_SEPOLIA_CHAIN_ID = arbitrumSepolia.id;

/** @deprecated Use ARBITRUM_SEPOLIA_CHAIN_ID / env; kept for imports that still reference Helium. */
export const FHELIUM_CHAIN_ID = 8008135;

export function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function strictModeEnabled() {
  if (process.env.ADNODE_STRICT_MODE) {
    return process.env.ADNODE_STRICT_MODE.toLowerCase() === "true";
  }
  return isProduction();
}

export function getConfiguredChainId() {
  return Number(
    process.env.VITE_CHAIN_ID || process.env.NEXT_PUBLIC_CHAIN_ID || ARBITRUM_SEPOLIA_CHAIN_ID,
  );
}

export function assertRuntimeSafety() {
  const chainId = getConfiguredChainId();
  if (!Number.isFinite(chainId) || chainId < 1) {
    throw new Error("Invalid VITE_CHAIN_ID / NEXT_PUBLIC_CHAIN_ID.");
  }
}
