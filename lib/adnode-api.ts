import { buildAdnodeAuthMessage, adnodeAuthHeaders } from "./adnode-auth";
import { ADNODE_CHAIN_ID } from "./chain";

// Default to same-origin API (works on Vercel + local Next dev). Override via NEXT_PUBLIC_API_URL if you host an external API.
const DEFAULT_API_BASE = "";
const RAW_API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL || DEFAULT_API_BASE;
const API_BASE = RAW_API_BASE;

export function getApiBase() {
  return API_BASE ? API_BASE.replace(/\/$/, "") : "";
}

export async function signedPostJson<T>(
  path: string,
  action: string,
  payload: Record<string, unknown>,
  signMessageAsync: (args: { message: string }) => Promise<`0x${string}`>,
  address: `0x${string}`,
): Promise<T> {
  const ts = String(Date.now());
  const nonce = crypto.randomUUID();
  const chainId = String(ADNODE_CHAIN_ID);
  const message = buildAdnodeAuthMessage(action, address, ts, payload, nonce, chainId);
  const signature = await signMessageAsync({ message });
  const headers = adnodeAuthHeaders(action, address, ts, nonce, chainId, signature);
  const res = await fetch(`${getApiBase()}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  const ct = String(res.headers.get("content-type") ?? "");
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    if (ct.includes("text/html")) {
      throw new Error("API endpoint returned HTML (likely misconfigured route).");
    }
    const err = (data as { error?: string }).error || text || res.statusText;
    throw new Error(typeof err === "string" ? err : "API request failed");
  }
  return data as T;
}

export async function postJson<T>(path: string, payload: Record<string, unknown>): Promise<T> {
  const base = getApiBase();
  const url = base ? `${base}${path}` : path;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  const ct = String(res.headers.get("content-type") ?? "");
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    if (ct.includes("text/html")) {
      throw new Error("API endpoint returned HTML (likely misconfigured route).");
    }
    const err = (data as { error?: string }).error || text || res.statusText;
    throw new Error(typeof err === "string" ? err : "API request failed");
  }
  return data as T;
}

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${getApiBase()}${path}`);
  const text = await res.text();

  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    const ct = String(res.headers.get("content-type") ?? "");
    if (ct.includes("text/html")) {
      throw new Error("API endpoint returned HTML (likely misconfigured route).");
    }
    const err = (data as { error?: string } | null)?.error;
    throw new Error(err || text || res.statusText);
  }

  if (data !== null) return data as T;
  return JSON.parse(text || "null") as T;
}

/** Public help chat - same-origin `/api/assistant-chat` so it works on Vercel/local without extra config. */
export async function postAssistantChat<T>(body: { prompt: string; history: Array<{ role: string; content: string }> }): Promise<T> {
  const base = getApiBase();
  const primaryUrl = base ? `${base}/api/assistant-chat` : "/api/assistant-chat";
  const fallbackUrl = base ? `${base}/api/assistant/chat` : "";
  let res = await fetch(primaryUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (base && res.status === 404 && fallbackUrl) {
    res = await fetch(fallbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }
  const text = await res.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = (data as { error?: string }).error || text || res.statusText;
    throw new Error(typeof err === "string" ? err : "Chat request failed");
  }
  return data as T;
}

export async function signedPostMultipart(
  path: string,
  action: string,
  signPayload: Record<string, unknown>,
  file: File,
  fieldName: string,
  signMessageAsync: (args: { message: string }) => Promise<`0x${string}`>,
  address: `0x${string}`,
): Promise<{ uri: string }> {
  const ts = String(Date.now());
  const nonce = crypto.randomUUID();
  const chainId = String(ADNODE_CHAIN_ID);
  const message = buildAdnodeAuthMessage(action, address, ts, signPayload, nonce, chainId);
  const signature = await signMessageAsync({ message });
  const headers = adnodeAuthHeaders(action, address, ts, nonce, chainId, signature);
  delete headers["Content-Type"];
  headers["x-adnode-upload-filename"] = String(signPayload.filename ?? "");
  headers["x-adnode-upload-size"] = String(signPayload.size ?? "");
  headers["x-adnode-upload-type"] = String(signPayload.type ?? "");
  const form = new FormData();
  form.append(fieldName, file);
  const res = await fetch(`${getApiBase()}${path}`, { method: "POST", headers, body: form });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || text || "Upload failed");
  }
  return data as { uri: string };
}
