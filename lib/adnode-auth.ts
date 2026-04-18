export function buildAdnodeAuthMessage(action: string, address: string, timestamp: string, payload: unknown) {
  const payloadText = JSON.stringify(payload ?? {});
  return [
    "AdNode API Authorization",
    `Action: ${action}`,
    `Address: ${address.toLowerCase()}`,
    `Timestamp: ${timestamp}`,
    `Payload: ${payloadText}`,
  ].join("\n");
}

export function adnodeAuthHeaders(
  action: string,
  address: string,
  timestamp: string,
  signature: `0x${string}`,
) {
  return {
    "Content-Type": "application/json",
    "x-adnode-action": action,
    "x-adnode-address": address,
    "x-adnode-timestamp": timestamp,
    "x-adnode-signature": signature,
  } as Record<string, string>;
}
