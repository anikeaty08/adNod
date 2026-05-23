import type { IncomingHttpHeaders } from "node:http";
import { keccak256, stringToBytes, verifyMessage } from "viem";
import { connectDatabase } from "./db.js";
import { AuthNonceModel } from "./models/AuthNonce.js";
import { getConfiguredChainId, strictModeEnabled } from "./runtime.js";

const AUTH_WINDOW_MS = 5 * 60 * 1000;
const memoryAuthNonces = new Set<string>();

function hashPayload(payload: unknown) {
  return keccak256(stringToBytes(JSON.stringify(payload ?? {})));
}

function buildAuthMessage(action: string, address: string, timestamp: string, payload: unknown, nonce: string, chainId: string) {
  return [
    "AdNode API Authorization",
    `Action: ${action}`,
    `Chain ID: ${chainId}`,
    `Address: ${address.toLowerCase()}`,
    `Timestamp: ${timestamp}`,
    `Nonce: ${nonce}`,
    `Payload Hash: ${hashPayload(payload)}`,
  ].join("\n");
}

function readHeader(headers: IncomingHttpHeaders, key: string) {
  const value = headers[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export async function assertSignedRequest(headers: IncomingHttpHeaders, action: string, payload: unknown) {
  const headerAction = readHeader(headers, "x-adnode-action");
  const chainId = readHeader(headers, "x-adnode-chain-id");
  const address = readHeader(headers, "x-adnode-address");
  const timestamp = readHeader(headers, "x-adnode-timestamp");
  const nonce = readHeader(headers, "x-adnode-nonce");
  const signature = readHeader(headers, "x-adnode-signature");

  if (!headerAction || !chainId || !address || !timestamp || !nonce || !signature) {
    throw new Error("Missing AdNode authorization headers.");
  }

  if (headerAction !== action) {
    throw new Error("Invalid AdNode authorization action.");
  }
  if (Number(chainId) !== getConfiguredChainId()) {
    throw new Error("Invalid AdNode authorization chain id.");
  }

  const parsedTimestamp = Number(timestamp);
  if (!Number.isFinite(parsedTimestamp) || Math.abs(Date.now() - parsedTimestamp) > AUTH_WINDOW_MS) {
    throw new Error("AdNode authorization expired. Please retry.");
  }
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(nonce)) {
    throw new Error("Invalid AdNode authorization nonce.");
  }

  const isValid = await verifyMessage({
    address: address as `0x${string}`,
    message: buildAuthMessage(action, address, timestamp, payload, nonce, chainId),
    signature: signature as `0x${string}`,
  });

  if (!isValid) {
    throw new Error("Invalid AdNode authorization signature.");
  }

  try {
    await connectDatabase();
    await AuthNonceModel.create({
      nonce,
      address: address.toLowerCase(),
      action,
      chainId: Number(chainId),
      expiresAt: new Date(parsedTimestamp + AUTH_WINDOW_MS),
    });
  } catch (error) {
    if ((error as { code?: number })?.code === 11000 || (error instanceof Error && error.message.includes("E11000"))) {
      throw new Error("AdNode authorization nonce already used.");
    }
    if (strictModeEnabled()) throw error;
    const key = `${chainId}:${address.toLowerCase()}:${action}:${nonce}`;
    if (memoryAuthNonces.has(key)) {
      throw new Error("AdNode authorization nonce already used.");
    }
    memoryAuthNonces.add(key);
  }

  return address.toLowerCase();
}
