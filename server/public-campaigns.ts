import adRegistryAbi from "../src/lib/abi/registry-abi.json" with { type: "json" };
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
      ? `<video id="adnode-media" muted autoplay loop playsinline preload="metadata" style="width:100%;display:block;border-radius:16px;background:#0b1220" src="${assetUrl}"></video>`
      : `<img id="adnode-media" alt="${title}" src="${assetUrl}" style="width:100%;display:block;border-radius:16px;object-fit:cover;background:#e2e8f0" />`;

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
        background: transparent;
        color: #0f172a;
      }
      .wrap { padding: 0; }
      .ad {
        display: block;
        text-decoration: none;
        border: 1px solid rgba(2,6,23,0.12);
        border-radius: 18px;
        background: rgba(255,255,255,0.9);
        overflow: hidden;
        box-shadow: 0 8px 24px rgba(2,6,23,0.08);
      }
      .top {
        display:flex;
        align-items:center;
        justify-content:space-between;
        padding: 10px 12px;
        gap: 10px;
        background: rgba(248,250,252,0.95);
      }
      .pill {
        display:inline-flex;
        align-items:center;
        gap: 8px;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color:#0f172a;
      }
      .pill b {
        display:inline-flex;
        padding: 4px 8px;
        border-radius: 999px;
        background: rgba(14,165,233,0.16);
        color: #075985;
      }
      .hint {
        font-size: 11px;
        color: rgba(15,23,42,0.7);
        white-space: nowrap;
      }
      .copy {
        padding: 10px 12px 12px;
      }
      .headline {
        font-family: "Space Grotesk", Inter, Arial, sans-serif;
        font-size: 14px;
        font-weight: 700;
        line-height: 1.25;
        margin: 0;
        color: #0f172a;
      }
      .sub {
        margin: 6px 0 0;
        font-size: 12px;
        line-height: 1.45;
        color: rgba(15,23,42,0.75);
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      @media (prefers-color-scheme: dark) {
        .ad { background: rgba(2,6,23,0.65); border-color: rgba(148,163,184,0.18); }
        .top { background: rgba(2,6,23,0.55); }
        .pill { color: rgba(226,232,240,0.95); }
        .pill b { background: rgba(56,189,248,0.16); color: rgba(186,230,253,0.95); }
        .hint { color: rgba(226,232,240,0.65); }
        .headline { color: rgba(226,232,240,0.95); }
        .sub { color: rgba(226,232,240,0.7); }
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <a class="ad" id="adnode-root" href="#" aria-label="Sponsored ad">
        <div class="top">
          <span class="pill"><b>Ad</b> ${category}</span>
          <span class="hint">Sponsored</span>
        </div>
        <div style="padding: 0 12px 0">${media}</div>
        <div class="copy">
          <p class="headline">${title}</p>
          <p class="sub">${description}</p>
        </div>
      </a>
    </div>
    <script>
      (function () {
        var creativeUrl = ${creativeUrlJs};
        var endpoint = "${safeOrigin}/api/measure";
        var token = "${safeMeasurementToken}";
        var sentImpression = false;
        var impressionTimer = null;

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

        function scheduleImpression() {
          if (sentImpression) return;
          if (impressionTimer) return;
          impressionTimer = setTimeout(function () {
            if (sentImpression) return;
            sentImpression = true;
            send("impression");
          }, 5000);
        }

        function cancelImpression() {
          if (!impressionTimer) return;
          clearTimeout(impressionTimer);
          impressionTimer = null;
        }

        window.addEventListener("load", function () {
          // Fallback: if the embed can't observe viewability, still send after 5s.
          scheduleImpression();
        }, { once: true });

        var root = document.getElementById("adnode-root");
        if (root) {
          root.addEventListener("click", function (e) {
            e.preventDefault();
            send("click");
            if (creativeUrl) window.open(creativeUrl, "_blank", "noreferrer");
          });
        }

        var media = document.getElementById("adnode-media");
        if (media) {
          media.addEventListener("click", function () {
            send("click");
          });
        }

        if ("IntersectionObserver" in window && root) {
          try {
            var obs = new IntersectionObserver(function (entries) {
              var e = entries && entries[0];
              if (!e) return;
              if (e.isIntersecting && e.intersectionRatio >= 0.6) {
                scheduleImpression();
              } else {
                cancelImpression();
              }
            }, { threshold: [0, 0.6, 1] });
            obs.observe(root);
          } catch (e) {}
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
