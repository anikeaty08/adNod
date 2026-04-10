import type { IncomingHttpHeaders } from "node:http";
import { verifyMessage } from "viem";

const AUTH_WINDOW_MS = 5 * 60 * 1000;

function buildAuthMessage(action: string, address: string, timestamp: string, payload: string) {
  return [
    "AdNode API Authorization",
    `Action: ${action}`,
    `Address: ${address.toLowerCase()}`,
    `Timestamp: ${timestamp}`,
    `Payload: ${payload}`,
  ].join("\n");
}

function readHeader(headers: IncomingHttpHeaders, key: string) {
  const value = headers[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export async function assertSignedRequest(headers: IncomingHttpHeaders, action: string, payload: unknown) {
  const headerAction = readHeader(headers, "x-adnode-action");
  const address = readHeader(headers, "x-adnode-address");
  const timestamp = readHeader(headers, "x-adnode-timestamp");
  const signature = readHeader(headers, "x-adnode-signature");

  if (!headerAction || !address || !timestamp || !signature) {
    throw new Error("Missing AdNode authorization headers.");
  }

  if (headerAction !== action) {
    throw new Error("Invalid AdNode authorization action.");
  }

  const parsedTimestamp = Number(timestamp);
  if (!Number.isFinite(parsedTimestamp) || Math.abs(Date.now() - parsedTimestamp) > AUTH_WINDOW_MS) {
    throw new Error("AdNode authorization expired. Please retry.");
  }

  const payloadText = JSON.stringify(payload ?? {});
  const isValid = await verifyMessage({
    address: address as `0x${string}`,
    message: buildAuthMessage(action, address, timestamp, payloadText),
    signature: signature as `0x${string}`,
  });

  if (!isValid) {
    throw new Error("Invalid AdNode authorization signature.");
  }

  return address.toLowerCase();
}
