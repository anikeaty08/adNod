import type { IncomingMessage, ServerResponse } from "node:http";
import "dotenv/config";
import { parseMultipartUpload, uploadBufferToPinata } from "../../server/pinata.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  try {
    const file = await parseMultipartUpload(req);
    const uri = await uploadBufferToPinata(file);
    res.statusCode = 201;
    res.end(JSON.stringify({ uri }));
  } catch (error) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : "Creative upload failed." }));
  }
}
