import "dotenv/config";

import { buildAdnodeAuthMessage, adnodeAuthHeaders } from "../lib/adnode-auth";
import { privateKeyToAccount } from "viem/accounts";

function env(name: string): string | undefined {
  const v = process.env[name];
  return v ? v.trim() : undefined;
}

function must(name: string): string {
  const v = env(name);
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

function parseArg(name: string, fallback?: string): string | undefined {
  const idx = process.argv.findIndex((x) => x === `--${name}`);
  if (idx === -1) return fallback;
  const v = process.argv[idx + 1];
  if (!v) throw new Error(`Missing value for --${name}`);
  return v;
}

function apiBase(): string {
  const raw = env("NEXT_PUBLIC_API_URL") || env("VITE_API_URL") || "http://127.0.0.1:4000";
  return raw.replace(/\/$/, "");
}

async function main() {
  const privateKeyRaw = must("PRIVATE_KEY");
  const privateKey = (privateKeyRaw.startsWith("0x") ? privateKeyRaw : `0x${privateKeyRaw}`) as `0x${string}`;
  const account = privateKeyToAccount(privateKey);

  const chainCampaignId = parseArg("id");
  if (!chainCampaignId) throw new Error("Pass --id <chainCampaignId>");

  const payload = {
    chainCampaignId,
    title: parseArg("title", "AdNode demo campaign") ?? "AdNode demo campaign",
    description:
      parseArg(
        "description",
        "Sample campaign for listings and embeds. Edit this copy before production. Category matches publisher slots using the same string.",
      ) ??
      "Sample campaign for listings and embeds. Edit this copy before production. Category matches publisher slots using the same string.",
    creativeURI: parseArg("creative", "https://picsum.photos/seed/adnode-demo/800/400") ?? "https://picsum.photos/seed/adnode-demo/800/400",
    category: parseArg("category", "news") ?? "news",
    pricingModel: parseArg("pricingModel", "CPC") ?? "CPC",
    rate: parseArg("rate", "0.0001") ?? "0.0001",
    advertiser: account.address,
  };

  const action = "campaigns:create";
  const ts = String(Date.now());
  const message = buildAdnodeAuthMessage(action, account.address, ts, payload);
  const signature = await account.signMessage({ message });
  const headers = adnodeAuthHeaders(action, account.address, ts, signature);

  const res = await fetch(`${apiBase()}/api/campaigns`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(text || res.statusText);
  // eslint-disable-next-line no-console
  console.log(text || "ok");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});

