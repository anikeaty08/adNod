export async function uploadCreativeToIpfs(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "" : "http://127.0.0.1:4000");
  const response = await fetch(`${apiUrl}/api/uploads/creative`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ error: "Pinata upload failed." }))) as { error?: string };
    throw new Error(payload.error || "Pinata upload failed.");
  }

  const payload = (await response.json()) as { uri: string };
  return payload.uri;
}
