/** Match server/public-campaigns.ts buildEmbedScript for client-side preview. */
export function buildEmbedScript(origin: string, options: { slotId?: number; slotKey?: string }) {
  const safeOrigin = JSON.stringify(origin);
  const identifier = options.slotKey ? String(options.slotKey) : String(options.slotId ?? "");
  const param = options.slotKey ? "slotKey" : "slotId";
  return `(function(){\n  var identifier = ${JSON.stringify(identifier)};\n  var origin = ${safeOrigin};\n  var selector = '[data-adnode-slot=\"' + identifier + '\"]';\n  var mount = document.querySelector(selector);\n  if (!mount) {\n    mount = document.createElement('div');\n    mount.setAttribute('data-adnode-slot', identifier);\n    document.currentScript && document.currentScript.parentNode && document.currentScript.parentNode.insertBefore(mount, document.currentScript);\n  }\n  mount.innerHTML = '';\n  var frame = document.createElement('iframe');\n  frame.src = origin + '/api/embed?mode=frame&' + ${JSON.stringify(param)} + '=' + encodeURIComponent(identifier);\n  frame.loading = 'lazy';\n  frame.style.width = '100%';\n  frame.style.minHeight = '280px';\n  frame.style.border = '0';\n  frame.style.borderRadius = '20px';\n  frame.style.overflow = 'hidden';\n  frame.setAttribute('title', 'AdNode Slot ' + identifier);\n  mount.appendChild(frame);\n})();`;
}

export type EmbedLanguage = "script" | "html" | "react" | "next";

function embedFrameSrc(origin: string, options: { slotId?: number; slotKey?: string }) {
  const identifier = options.slotKey ? String(options.slotKey) : String(options.slotId ?? "");
  const param = options.slotKey ? "slotKey" : "slotId";
  return `${origin.replace(/\/$/, "")}/api/embed?mode=frame&${param}=${encodeURIComponent(identifier)}`;
}

/** Plain HTML: drop-in iframe (no JS). */
export function buildEmbedHtml(origin: string, options: { slotId?: number; slotKey?: string }) {
  const src = embedFrameSrc(origin, options);
  const label = options.slotKey ? String(options.slotKey) : String(options.slotId ?? "");
  return `<!-- AdNode slot ${label} -->
<iframe
  src="${src}"
  title="AdNode ad ${label}"
  loading="lazy"
  style="width:100%;min-height:280px;border:0;border-radius:20px"
/>`;
}

/** React client component (App Router friendly). */
export function buildEmbedReact(origin: string, options: { slotId?: number; slotKey?: string }) {
  const src = embedFrameSrc(origin, options);
  const label = options.slotKey ? String(options.slotKey) : String(options.slotId ?? "");
  return `'use client';

import { useEffect, useRef } from "react";

/** AdNode publisher slot ${label} */
export function AdNodeAdSlot() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    const frame = document.createElement("iframe");
    frame.src = ${JSON.stringify(src)};
    frame.loading = "lazy";
    frame.title = "AdNode ad ${label}";
    frame.style.width = "100%";
    frame.style.minHeight = "280px";
    frame.style.border = "0";
    frame.style.borderRadius = "20px";
    el.appendChild(frame);
  }, []);
  return <div ref={ref} data-adnode-slot="${label}" />;
}
`;
}

/** Next.js: same as React; import into a client page/section. */
export function buildEmbedNext(origin: string, options: { slotId?: number; slotKey?: string }) {
  return `${buildEmbedReact(origin, options)}
// Usage in app/page.tsx (or any client component):
// import { AdNodeAdSlot } from "@/components/adnode-ad-slot";
// <AdNodeAdSlot />
`;
}

export function buildEmbedForLanguage(lang: EmbedLanguage, origin: string, options: { slotId?: number; slotKey?: string }): string {
  switch (lang) {
    case "html":
      return buildEmbedHtml(origin, options);
    case "react":
      return buildEmbedReact(origin, options);
    case "next":
      return buildEmbedNext(origin, options);
    default:
      return buildEmbedScript(origin, options);
  }
}
