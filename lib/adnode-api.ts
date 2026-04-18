import { buildAdnodeAuthMessage, adnodeAuthHeaders } from "./adnode-auth";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL || "http://127.0.0.1:4000";

export function getApiBase() {
  return API_BASE.replace(/\/$/, "");
}

export async function signedPostJson<T>(
  path: string,
  action: string,
  payload: Record<string, unknown>,
  signMessageAsync: (args: { message: string }) => Promise<`0x${string}`>,
  address: `0x${string}`,
): Promise<T> {
  const ts = String(Date.now());
  const message = buildAdnodeAuthMessage(action, address, ts, payload);
  const signature = await signMessageAsync({ message });
  const headers = adnodeAuthHeaders(action, address, ts, signature);
  const res = await fetch(`${getApiBase()}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = (data as { error?: string }).error || text || res.statusText;
    throw new Error(typeof err === "string" ? err : "API request failed");
  }
  return data as T;
}

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${getApiBase()}${path}`);
  const text = await res.text();
  if (!res.ok) throw new Error(text || res.statusText);
  return JSON.parse(text || "null") as T;
}

/** Public help chat — same-origin `/api/assistant/chat` (Next route) so it works without pointing the UI at :4000. */
export async function postAssistantChat<T>(body: { prompt: string; history: Array<{ role: string; content: string }> }): Promise<T> {
  const url =
    typeof window !== "undefined"
      ? "/api/assistant/chat"
      : `${getApiBase()}/api/assistant/chat`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
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
  const message = buildAdnodeAuthMessage(action, address, ts, signPayload);
  const signature = await signMessageAsync({ message });
  const headers = adnodeAuthHeaders(action, address, ts, signature);
  delete headers["Content-Type"];
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
