import type { Address } from "viem";
import fhenixHelium from "../deployments/fhenixHelium.json";
import fhenixArbitrumSepolia from "../deployments/fhenixArbitrumSepolia.json";
import adRegistryAbi from "@/lib/abi/registry-abi.json";
import adAnalyticsAbi from "@/lib/abi/analytics-abi.json";
import payoutWrapperAbi from "@/lib/abi/payout-wrapper-abi.json";

const ZERO = "0x0000000000000000000000000000000000000000" as const;

/** Default: Arbitrum Sepolia deployment file. Set ADNODE_NETWORK=fhenixHelium for Helium addresses. */
function baseDeployment() {
  const useHelium =
    process.env.NEXT_PUBLIC_ADNODE_NETWORK === "fhenixHelium" ||
    process.env.VITE_ADNODE_NETWORK === "fhenixHelium";
  return useHelium ? fhenixHelium : fhenixArbitrumSepolia;
}

function pickAddress(envPrimary: string | undefined, envAlt: string | undefined, fallback: string): Address {
  const raw = (envPrimary || envAlt || fallback || ZERO).trim();
  if (!raw.startsWith("0x") || raw.length !== 42) {
    return ZERO;
  }
  return raw as Address;
}

const dep = baseDeployment();

export const CONTRACTS = {
  registry: pickAddress(
    process.env.NEXT_PUBLIC_AD_REGISTRY_ADDRESS,
    process.env.VITE_ADREGISTRY_ADDRESS,
    dep.adRegistry,
  ),
  analytics: pickAddress(
    process.env.NEXT_PUBLIC_AD_ANALYTICS_ADDRESS,
    process.env.VITE_ADANALYTICS_ADDRESS,
    dep.adAnalytics,
  ),
  payoutWrapper: pickAddress(
    process.env.NEXT_PUBLIC_PAYOUT_WRAPPER_ADDRESS,
    process.env.VITE_PAYOUT_WRAPPER_ADDRESS,
    dep.payoutWrapper,
  ),
} as const;

export const CONTRACTS_CONFIGURED =
  CONTRACTS.registry !== ZERO && CONTRACTS.analytics !== ZERO && CONTRACTS.payoutWrapper !== ZERO;

export { adRegistryAbi, adAnalyticsAbi, payoutWrapperAbi };
