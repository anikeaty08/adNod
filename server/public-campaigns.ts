import adRegistryAbi from "../src/lib/abi/AdRegistry.json" with { type: "json" };
import { getCampaigns } from "./campaign-store.js";
import { getSlots } from "./slot-store.js";
import { adRegistryAddress, serverPublicClient as publicClient } from "./chain-state.js";
import { createMeasurementToken } from "./measurement.js";

function getIpfsGatewayUrl(uri: string) {
  if (uri.startsWith("ipfs://")) {
    return `https://gateway.pinata.cloud/ipfs/${uri.replace("ipfs://", "")}`;
  }

  return uri;
}

function isPrivateHost(hostname: string) {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
  if (host.endsWith(".local")) return true;
  if (/^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  return false;
}

function isSafeAssetUrl(assetUrl: string) {
  try {
    const parsed = new URL(assetUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    if (isPrivateHost(parsed.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

async function resolveAssetKind(assetUrl: string) {
  if (!isSafeAssetUrl(assetUrl)) {
    return "unknown" as const;
  }

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

function assertRegistryConfigured() {
  if (!adRegistryAddress) {
    throw new Error("AdRegistry is not configured on the server.");
  }
}

function getRegistryAddress(): `0x${string}` {
  assertRegistryConfigured();
  return adRegistryAddress as `0x${string}`;
}

export async function getPublicCampaignById(campaignId: number) {
  const registryAddress = getRegistryAddress();

  const [creativeURI, category, active] = (await publicClient.readContract({
    address: registryAddress,
    abi: adRegistryAbi as any,
    functionName: "getPublicInfo" as any,
    args: [BigInt(campaignId)],
  })) as [string, string, boolean];
  const advertiser = (await publicClient.readContract({
    address: registryAddress,
    abi: adRegistryAbi as any,
    functionName: "campaignHoster" as any,
    args: [BigInt(campaignId)],
  })) as string;

  const metadata = await getCampaigns();
  const metadataItem = metadata.find((item) => String((item as { chainCampaignId?: string }).chainCampaignId ?? "") === String(campaignId)) as
    | {
        title?: string;
        description?: string;
        pricingModel?: "CPC" | "CPM";
        rate?: string;
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
    pricingModel: metadataItem?.pricingModel || "CPC",
    rate: metadataItem?.rate || "0",
    active,
  };
}

export async function getPublicSlotById(slotId: number) {
  const registryAddress = getRegistryAddress();

  const [developer, siteName, category, active, assignedCampaignId] = (await publicClient.readContract({
    address: registryAddress,
    abi: adRegistryAbi as any,
    functionName: "slots" as any,
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

export function buildEmbedScript(origin: string, options: { slotId?: number; slotKey?: string }) {
  const safeOrigin = JSON.stringify(origin);
  const identifier = options.slotKey ? String(options.slotKey) : String(options.slotId ?? "");
  const param = options.slotKey ? "slotKey" : "slotId";

  return `(function(){\n  var identifier = ${JSON.stringify(identifier)};\n  var origin = ${safeOrigin};\n  var selector = '[data-adnode-slot=\"' + identifier + '\"]';\n  var mount = document.querySelector(selector);\n  if (!mount) {\n    mount = document.createElement('div');\n    mount.setAttribute('data-adnode-slot', identifier);\n    document.currentScript && document.currentScript.parentNode && document.currentScript.parentNode.insertBefore(mount, document.currentScript);\n  }\n  mount.innerHTML = '';\n  var frame = document.createElement('iframe');\n  frame.src = origin + '/api/embed?mode=frame&' + ${JSON.stringify(param)} + '=' + encodeURIComponent(identifier);\n  frame.loading = 'lazy';\n  frame.style.width = '100%';\n  frame.style.minHeight = '280px';\n  frame.style.border = '0';\n  frame.style.borderRadius = '20px';\n  frame.style.overflow = 'hidden';\n  frame.setAttribute('title', 'AdNode Slot ' + identifier);\n  mount.appendChild(frame);\n})();`;
}

export function buildEmbedFrameHtml(
  campaign: Awaited<ReturnType<typeof getPublicCampaignBySlotId>>,
  options: {
    origin: string;
    measurementToken: string;
  },
) {
  const title = escapeHtml(campaign.title);
  const description = escapeHtml(campaign.description);
  const category = escapeHtml(campaign.category);
  const assetUrl = escapeHtml(campaign.assetUrl);
  const safeOrigin = escapeHtml(options.origin);
  const safeMeasurementToken = escapeHtml(options.measurementToken);
  const creativeUrlJs = JSON.stringify(campaign.assetUrl);

  const media =
    campaign.assetKind === "video"
      ? `<video id="adnode-media" controls playsinline preload="metadata" style="width:100%;border-radius:18px;background:#020617" src="${assetUrl}"></video>`
      : `<img id="adnode-media" alt="${title}" src="${assetUrl}" style="width:100%;display:block;border-radius:18px;object-fit:cover;background:#e0f2fe" />`;

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
        <a class="cta" id="adnode-cta" href="#" role="button">Open creative</a>
      </div>
    </div>
    <script>
      (function () {
        var creativeUrl = ${creativeUrlJs};
        var endpoint = "${safeOrigin}/api/measure";
        var token = "${safeMeasurementToken}";
        var sentImpression = false;

        function send(type) {
          var payload = JSON.stringify({
            token: token,
            eventType: type,
            pageUrl: window.location.href,
            referrer: document.referrer || ""
          });

          if (navigator.sendBeacon) {
            var blob = new Blob([payload], { type: "application/json" });
            navigator.sendBeacon(endpoint, blob);
            return;
          }

          fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            keepalive: true
          }).catch(function () {});
        }

        window.addEventListener("load", function () {
          if (sentImpression) return;
          sentImpression = true;
          send("impression");
        }, { once: true });

        var cta = document.getElementById("adnode-cta");
        if (cta) {
          cta.addEventListener("click", function (e) {
            e.preventDefault();
            send("click");
            if (creativeUrl) {
              window.open(creativeUrl, "_blank", "noreferrer");
            }
          });
        }

        var media = document.getElementById("adnode-media");
        if (media) {
          media.addEventListener("click", function () {
            send("click");
          });
        }
      })();
    </script>
  </body>
</html>`;
}

export function createEmbedFramePayload(
  campaign: Awaited<ReturnType<typeof getPublicCampaignBySlotId>>,
  origin: string,
) {
  return {
    campaign,
    measurementToken: createMeasurementToken({
      chainCampaignId: campaign.id,
      chainSlotId: campaign.slotId,
    }),
    origin,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
