import type { RequestAuthInput } from "@/lib/api";
import { createSignedRequestAuth, toSignedHeaders } from "@/lib/request-auth";

export async function uploadCreativeToIpfs(file: File, auth: RequestAuthInput) {
  const formData = new FormData();
  formData.append("file", file);

  const isLocalPreview =
    typeof window !== "undefined" && (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost");
  const apiUrl = import.meta.env.VITE_API_URL || (isLocalPreview ? "http://127.0.0.1:4000" : "");
  const signedAuth = await createSignedRequestAuth({
    action: "uploads:creative",
    address: auth.address,
    payload: {
      filename: file.name,
      size: file.size,
      type: file.type,
    },
    walletClient: auth.walletClient,
  });
  const response = await fetch(`${apiUrl}/api/uploads/creative`, {
    method: "POST",
    headers: toSignedHeaders(signedAuth),
    body: formData,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ error: "Pinata upload failed." }))) as { error?: string };
    throw new Error(payload.error || "Pinata upload failed.");
  }

  const payload = (await response.json()) as { uri: string };
  return payload.uri;
}
