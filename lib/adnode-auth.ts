import { keccak256, stringToBytes } from "viem";

export function hashAdnodePayload(payload: unknown) {
  const payloadText = JSON.stringify(payload ?? {});
  return keccak256(stringToBytes(payloadText));
}

export function buildAdnodeAuthMessage(action: string, address: string, timestamp: string, payload: unknown, nonce: string, chainId: string) {
  return [
    "AdNode API Authorization",
    `Action: ${action}`,
    `Chain ID: ${chainId}`,
    `Address: ${address.toLowerCase()}`,
    `Timestamp: ${timestamp}`,
    `Nonce: ${nonce}`,
    `Payload Hash: ${hashAdnodePayload(payload)}`,
  ].join("\n");
}

export function adnodeAuthHeaders(
  action: string,
  address: string,
  timestamp: string,
  nonce: string,
  chainId: string,
  signature: `0x${string}`,
) {
  return {
    "Content-Type": "application/json",
    "x-adnode-action": action,
    "x-adnode-chain-id": chainId,
    "x-adnode-address": address,
    "x-adnode-timestamp": timestamp,
    "x-adnode-nonce": nonce,
    "x-adnode-signature": signature,
  } as Record<string, string>;
}
