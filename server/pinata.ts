import Busboy from "busboy";
import type { IncomingMessage } from "node:http";

interface ParsedUpload {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif", "video/mp4", "video/webm"]);

function detectMimeType(buffer: Buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  const header6 = buffer.subarray(0, 6).toString("ascii");
  if (header6 === "GIF87a" || header6 === "GIF89a") {
    return "image/gif";
  }
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    return "video/mp4";
  }
  if (buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) {
    return "video/webm";
  }
  return "";
}

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
      const detectedMimeType = detectMimeType(buffer);
      if (!detectedMimeType || detectedMimeType !== mimeType) {
        reject(new Error("Creative file content does not match the declared type."));
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
