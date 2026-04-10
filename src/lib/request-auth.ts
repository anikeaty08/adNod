import type { WalletClient } from "viem";

export interface SignedRequestAuth {
  address: string;
  timestamp: string;
  signature: `0x${string}`;
  action: string;
}

function buildAuthMessage(action: string, address: string, timestamp: string, payload: string) {
  return [
    "AdNode API Authorization",
    `Action: ${action}`,
    `Address: ${address.toLowerCase()}`,
    `Timestamp: ${timestamp}`,
    `Payload: ${payload}`,
  ].join("\n");
}

export function serializeAuthPayload(payload: unknown) {
  return JSON.stringify(payload ?? {});
}

export async function createSignedRequestAuth({
  action,
  address,
  payload,
  walletClient,
}: {
  action: string;
  address: string;
  payload: unknown;
  walletClient: WalletClient;
}): Promise<SignedRequestAuth> {
  const timestamp = String(Date.now());
  const payloadText = serializeAuthPayload(payload);
  const signature = await walletClient.signMessage({
    account: walletClient.account ?? (address as `0x${string}`),
    message: buildAuthMessage(action, address, timestamp, payloadText),
  });

  return {
    action,
    address,
    timestamp,
    signature,
  };
}

export function toSignedHeaders(auth: SignedRequestAuth) {
  return {
    "X-AdNode-Action": auth.action,
    "X-AdNode-Address": auth.address,
    "X-AdNode-Timestamp": auth.timestamp,
    "X-AdNode-Signature": auth.signature,
  };
}
