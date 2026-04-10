import { createPublicClient, http } from "viem";
import { defineChain } from "viem";
import adRegistryAbi from "../src/lib/abi/AdRegistry.json" with { type: "json" };
import { getCampaigns } from "./campaign-store.js";
import { getSlots } from "./slot-store.js";

const rpcUrl = process.env.VITE_FHENIX_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc";
const chainId = Number(process.env.VITE_CHAIN_ID || 421614);
const adRegistryAddress = (process.env.VITE_ADREGISTRY_ADDRESS || "0xd559D7bcE4A56fCdEE0C80a315eB568c4C841588") as `0x${string}`;

const chain = defineChain({
  id: chainId,
  name: "Arbitrum Sepolia",
  network: "arbitrum-sepolia",
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [rpcUrl],
    },
    public: {
      http: [rpcUrl],
    },
  },
});

const publicClient = createPublicClient({
  chain,
  transport: http(rpcUrl),
});

function getIpfsGatewayUrl(uri: string) {
  if (uri.startsWith("ipfs://")) {
    return `https://gateway.pinata.cloud/ipfs/${uri.replace("ipfs://", "")}`;
  }

  return uri;
}

async function resolveAssetKind(assetUrl: string) {
  const lower = assetUrl.toLowerCase();

  if (lower.endsWith(".mp4") || lower.endsWith(".webm")) {
    return "video" as const;
  }

  if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".gif") || lower.endsWith(".svg") || lower.endsWith(".webp")) {
    return "image" as const;
  }

  try {
    const response = await fetch(assetUrl, { method: "HEAD" });
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

    if (contentType.startsWith("video/")) {
      return "video" as const;
    }

    if (contentType.startsWith("image/")) {
      return "image" as const;
    }
  } catch {
    return "unknown" as const;
  }

  return "unknown" as const;
}

export async function getPublicCampaignById(campaignId: number) {
  const [creativeURI, category, active] = (await publicClient.readContract({
    address: adRegistryAddress,
    abi: adRegistryAbi,
    functionName: "getPublicInfo",
    args: [BigInt(campaignId)],
  })) as [string, string, boolean];
  const advertiser = (await publicClient.readContract({
    address: adRegistryAddress,
    abi: adRegistryAbi,
    functionName: "campaignHoster",
    args: [BigInt(campaignId)],
  })) as string;

  const metadata = await getCampaigns();
  const metadataItem = metadata.find((item) => String((item as { chainCampaignId?: string }).chainCampaignId ?? "") === String(campaignId)) as
    | {
        title?: string;
        description?: string;
        advertiser?: string;
      }
    | undefined;

  const assetUrl = getIpfsGatewayUrl(creativeURI);
  const assetKind = await resolveAssetKind(assetUrl);

  return {
    id: String(campaignId),
    title: metadataItem?.title || `Campaign ${campaignId}`,
    description: metadataItem?.description || "AdNode campaign creative",
    advertiser,
    creativeURI,
    assetUrl,
    assetKind,
    category,
    active,
  };
}

export async function getPublicSlotById(slotId: number) {
  const [developer, siteName, category, active, assignedCampaignId] = (await publicClient.readContract({
    address: adRegistryAddress,
    abi: adRegistryAbi,
    functionName: "slots",
    args: [BigInt(slotId)],
  })) as [string, string, string, boolean, bigint];

  const metadata = await getSlots();
  const metadataItem = metadata.find((item) => String((item as { chainSlotId?: string }).chainSlotId ?? "") === String(slotId)) as
    | {
        siteName?: string;
        siteUrl?: string;
        dailyTrafficEstimate?: string;
      }
    | undefined;

  return {
    id: String(slotId),
    developer,
    siteName: metadataItem?.siteName || siteName,
    siteUrl: metadataItem?.siteUrl || "",
    dailyTrafficEstimate: metadataItem?.dailyTrafficEstimate || "",
    category,
    active,
    assignedCampaignId: Number(assignedCampaignId),
  };
}

export async function getPublicCampaignBySlotId(slotId: number) {
  const slot = await getPublicSlotById(slotId);

  if (!slot.active) {
    throw new Error("Slot is inactive.");
  }

  if (!Number.isFinite(slot.assignedCampaignId) || slot.assignedCampaignId < 1) {
    throw new Error("No campaign is assigned to this slot.");
  }

  return {
    ...(await getPublicCampaignById(slot.assignedCampaignId)),
    slotId: String(slotId),
  };
}

export function buildEmbedScript(origin: string, options: { campaignId?: number; slotId?: number }) {
  const safeOrigin = JSON.stringify(origin);
  const slotId = options.slotId ? String(options.slotId) : null;
  const campaignId = options.campaignId ? String(options.campaignId) : null;
  const identifier = slotId ?? campaignId ?? "";
  const selectorAttribute = slotId ? "data-adnode-slot" : "data-adnode-campaign";
  const frameQuery = slotId
    ? `slotId=' + encodeURIComponent(identifier)`
    : `campaignId=' + encodeURIComponent(identifier)`;

  return `(function(){\n  var identifier = ${JSON.stringify(identifier)};\n  var origin = ${safeOrigin};\n  var selector = '[${selectorAttribute}=\"' + identifier + '\"]';\n  var mount = document.querySelector(selector);\n  if (!mount) {\n    mount = document.createElement('div');\n    mount.setAttribute('${selectorAttribute}', identifier);\n    document.currentScript && document.currentScript.parentNode && document.currentScript.parentNode.insertBefore(mount, document.currentScript);\n  }\n  mount.innerHTML = '';\n  var frame = document.createElement('iframe');\n  frame.src = origin + '/api/embed?mode=frame&${frameQuery}';\n  frame.loading = 'lazy';\n  frame.style.width = '100%';\n  frame.style.minHeight = '280px';\n  frame.style.border = '0';\n  frame.style.borderRadius = '20px';\n  frame.style.overflow = 'hidden';\n  frame.setAttribute('title', 'AdNode Slot ' + identifier);\n  mount.appendChild(frame);\n})();`;
}

export function buildEmbedFrameHtml(campaign: Awaited<ReturnType<typeof getPublicCampaignById>>) {
  const title = escapeHtml(campaign.title);
  const description = escapeHtml(campaign.description);
  const category = escapeHtml(campaign.category);
  const assetUrl = escapeHtml(campaign.assetUrl);
  const creativeLink = escapeHtml(campaign.creativeURI);

  const media =
    campaign.assetKind === "video"
      ? `<video controls playsinline preload="metadata" style="width:100%;border-radius:18px;background:#020617" src="${assetUrl}"></video>`
      : `<img alt="${title}" src="${assetUrl}" style="width:100%;display:block;border-radius:18px;object-fit:cover;background:#e0f2fe" />`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      :root { color-scheme: light dark; }
      body {
        margin: 0;
        font-family: Inter, Arial, sans-serif;
        background: linear-gradient(135deg, #f0f9ff 0%, #dbeafe 45%, #e0f2fe 100%);
        color: #0f172a;
      }
      .shell {
        border: 1px solid rgba(255,255,255,0.65);
        border-radius: 24px;
        background: rgba(255,255,255,0.76);
        backdrop-filter: blur(14px);
        padding: 18px;
      }
      .badge {
        display: inline-flex;
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(14,165,233,0.12);
        color: #0369a1;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
      }
      h1 {
        font-family: "Space Grotesk", Inter, Arial, sans-serif;
        font-size: 24px;
        margin: 14px 0 8px;
      }
      p {
        margin: 0;
        line-height: 1.6;
      }
      .meta {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 14px;
        font-size: 12px;
        color: #475569;
      }
      .cta {
        display: inline-flex;
        margin-top: 16px;
        text-decoration: none;
        color: white;
        background: #0ea5e9;
        border-radius: 999px;
        padding: 12px 18px;
        font-weight: 700;
      }
      .wrap {
        padding: 14px;
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="shell">
        <span class="badge">${category}</span>
        <h1>${title}</h1>
        <p>${description}</p>
        <div style="margin-top:16px">${media}</div>
        <div class="meta">
          <span>AdNode public creative</span>
          <span>${campaign.active ? "Active" : "Paused"}</span>
        </div>
        <a class="cta" href="${assetUrl}" target="_blank" rel="noreferrer">Open creative</a>
        <div class="meta"><span>${creativeLink}</span></div>
      </div>
    </div>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
