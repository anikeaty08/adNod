import fhenixArbitrumSepolia from "../deployments/fhenixArbitrumSepolia.json" with { type: "json" };
import fhenixHelium from "../deployments/fhenixHelium.json" with { type: "json" };
import { arbitrumSepolia } from "viem/chains";

export const ARBITRUM_SEPOLIA_CHAIN_ID = arbitrumSepolia.id;
export const FHELIUM_CHAIN_ID = 8008135;
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export type AdNodeNetworkKey = "fhenixArbitrumSepolia" | "fhenixHelium";

export interface DeploymentConfig {
  network: AdNodeNetworkKey;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  payoutWrapper: `0x${string}`;
  wrappedNativeToken: `0x${string}`;
  adRegistry: `0x${string}`;
  adAnalytics: `0x${string}`;
  deployer?: `0x${string}` | null;
  blockNumber?: number | null;
  txHashes?: Record<string, `0x${string}`>;
  abiVersion: string;
  deployedAt: string;
}

export function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function strictModeEnabled() {
  if (process.env.ADNODE_STRICT_MODE) {
    return process.env.ADNODE_STRICT_MODE.toLowerCase() === "true";
  }
  return isProduction();
}

export function getConfiguredNetworkKey(): AdNodeNetworkKey {
  const raw = process.env.ADNODE_NETWORK || process.env.VITE_ADNODE_NETWORK || process.env.NEXT_PUBLIC_ADNODE_NETWORK || "fhenixArbitrumSepolia";
  if (raw !== "fhenixArbitrumSepolia" && raw !== "fhenixHelium") {
    throw new Error(`Unsupported ADNODE_NETWORK '${raw}'. Use fhenixArbitrumSepolia or fhenixHelium.`);
  }
  return raw;
}

function defaultRpcUrl(network: AdNodeNetworkKey) {
  if (network === "fhenixHelium") {
    return process.env.FHENIX_HELIUM_RPC_URL || "https://api.helium.fhenix.zone";
  }
  return process.env.VITE_FHENIX_RPC_URL || process.env.ARBITRUM_SEPOLIA_RPC_URL || arbitrumSepolia.rpcUrls.default.http[0];
}

function defaultExplorerUrl(network: AdNodeNetworkKey) {
  return network === "fhenixHelium" ? "https://explorer.helium.fhenix.zone" : "https://sepolia.arbiscan.io";
}

function defaultChainId(network: AdNodeNetworkKey) {
  return network === "fhenixHelium" ? FHELIUM_CHAIN_ID : ARBITRUM_SEPOLIA_CHAIN_ID;
}

function isAddress(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[a-fA-F0-9]{40}$/.test(value);
}

function pickAddress(primary: string | undefined, fallback: unknown, label: string): `0x${string}` {
  const value = primary || String(fallback || "");
  if (!isAddress(value)) {
    throw new Error(`${label} must be a valid EVM address for the selected AdNode network.`);
  }
  return value;
}

function rawDeployment(network: AdNodeNetworkKey) {
  return network === "fhenixHelium" ? (fhenixHelium as Record<string, unknown>) : (fhenixArbitrumSepolia as Record<string, unknown>);
}

export function getDeploymentConfig(options: { allowUndeployed?: boolean } = {}): DeploymentConfig {
  const network = getConfiguredNetworkKey();
  const raw = rawDeployment(network);
  const chainId = Number(process.env.VITE_CHAIN_ID || process.env.NEXT_PUBLIC_CHAIN_ID || raw.chainId || defaultChainId(network));

  if (!Number.isFinite(chainId) || chainId !== defaultChainId(network)) {
    throw new Error(`Selected network ${network} must use chain id ${defaultChainId(network)}.`);
  }

  const deployment: DeploymentConfig = {
    network,
    chainId,
    rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || defaultRpcUrl(network),
    explorerUrl: String(raw.explorerUrl || defaultExplorerUrl(network)),
    payoutWrapper: pickAddress(process.env.VITE_PAYOUT_WRAPPER_ADDRESS || process.env.NEXT_PUBLIC_PAYOUT_WRAPPER_ADDRESS, raw.payoutWrapper, "Payout wrapper"),
    wrappedNativeToken: pickAddress(process.env.WRAPPED_NATIVE_TOKEN_ADDRESS, raw.wrappedNativeToken, "Wrapped native token"),
    adRegistry: pickAddress(process.env.VITE_ADREGISTRY_ADDRESS || process.env.NEXT_PUBLIC_AD_REGISTRY_ADDRESS, raw.adRegistry, "AdRegistry"),
    adAnalytics: pickAddress(process.env.VITE_ADANALYTICS_ADDRESS || process.env.NEXT_PUBLIC_AD_ANALYTICS_ADDRESS, raw.adAnalytics, "AdAnalytics"),
    deployer: isAddress(raw.deployer) ? raw.deployer : null,
    blockNumber: typeof raw.blockNumber === "number" ? raw.blockNumber : null,
    txHashes: (raw.txHashes && typeof raw.txHashes === "object" ? raw.txHashes : {}) as Record<string, `0x${string}`>,
    abiVersion: String(raw.abiVersion || "unknown"),
    deployedAt: String(raw.deployedAt || ""),
  };

  if (!options.allowUndeployed) {
    for (const [label, address] of Object.entries({
      payoutWrapper: deployment.payoutWrapper,
      wrappedNativeToken: deployment.wrappedNativeToken,
      adRegistry: deployment.adRegistry,
      adAnalytics: deployment.adAnalytics,
    })) {
      if (address.toLowerCase() === ZERO_ADDRESS) {
        throw new Error(`${network} is not deployed: ${label} is the zero address.`);
      }
    }
  }

  return deployment;
}

export function getConfiguredChainId() {
  return getDeploymentConfig({ allowUndeployed: true }).chainId;
}

export function assertRuntimeSafety() {
  getDeploymentConfig({ allowUndeployed: !strictModeEnabled() });
}
