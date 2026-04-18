import type { IncomingMessage, ServerResponse } from "node:http";
import "dotenv/config";
import { getDatabaseReady } from "../server/campaign-store.js";
import { getRegistryChainHealth } from "../server/chain-state.js";

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  const databaseReady = await getDatabaseReady();
  const chain = await getRegistryChainHealth();
  res.setHeader("Content-Type", "application/json");
  res.statusCode = 200;
  res.end(JSON.stringify({ ok: true, service: "adnode-api", databaseReady, ...chain }));
}
