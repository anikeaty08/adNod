export async function uploadCreativeToIpfs(file: File) {
  const jwt = import.meta.env.VITE_PINATA_JWT;

  if (!jwt) {
    throw new Error("VITE_PINATA_JWT is not set.");
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Pinata upload failed.");
  }

  const payload = (await response.json()) as { IpfsHash: string };
  return `ipfs://${payload.IpfsHash}`;
}
