import Busboy from "busboy";
import type { IncomingMessage } from "node:http";

interface ParsedUpload {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "video/mp4", "video/webm"]);

export async function parseMultipartUpload(req: IncomingMessage): Promise<ParsedUpload> {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: req.headers,
      limits: { files: 1, fileSize: MAX_UPLOAD_BYTES },
    });

    let chunks: Buffer[] = [];
    let filename = "upload.bin";
    let mimeType = "application/octet-stream";
    let hasFile = false;

    busboy.on("file", (_fieldname, file, info) => {
      hasFile = true;
      filename = info.filename || filename;
      mimeType = info.mimeType || mimeType;
      if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        reject(new Error("Unsupported creative file type."));
        file.resume();
        return;
      }

      file.on("data", (chunk) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });

      file.on("limit", () => {
        reject(new Error("Upload exceeds the 10MB limit."));
      });
    });

    busboy.on("error", reject);
    busboy.on("finish", () => {
      if (!hasFile) {
        reject(new Error("No file was provided."));
        return;
      }

      const buffer = Buffer.concat(chunks);
      if (buffer.byteLength > MAX_UPLOAD_BYTES) {
        reject(new Error("Upload exceeds the 10MB limit."));
        return;
      }

      resolve({
        buffer,
        filename,
        mimeType,
      });
    });

    req.pipe(busboy);
  });
}

export async function uploadBufferToPinata(file: ParsedUpload) {
  const jwt = process.env.PINATA_JWT;
  const apiKey = process.env.PINATA_API_KEY;
  const apiSecret = process.env.PINATA_API_SECRET;

  if (!jwt && !(apiKey && apiSecret)) {
    throw new Error("Pinata credentials are not configured on the server.");
  }

  const bytes = new Uint8Array(file.buffer.byteLength);
  bytes.set(file.buffer);

  const formData = new FormData();
  formData.append("file", new Blob([bytes], { type: file.mimeType }), file.filename);

  const headers: Record<string, string> = {};
  if (jwt) {
    headers.Authorization = `Bearer ${jwt}`;
  } else {
    headers.pinata_api_key = apiKey!;
    headers.pinata_secret_api_key = apiSecret!;
  }

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pinata upload failed: ${errorText}`);
  }

  const payload = (await response.json()) as { IpfsHash: string };
  return `ipfs://${payload.IpfsHash}`;
}
