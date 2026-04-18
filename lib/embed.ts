/** Match server/public-campaigns.ts buildEmbedScript for client-side preview. */
export function buildEmbedScript(origin: string, slotId: number) {
  const safeOrigin = JSON.stringify(origin);
  const identifier = String(slotId);
  return `(function(){\n  var identifier = ${JSON.stringify(identifier)};\n  var origin = ${safeOrigin};\n  var selector = '[data-adnode-slot=\"' + identifier + '\"]';\n  var mount = document.querySelector(selector);\n  if (!mount) {\n    mount = document.createElement('div');\n    mount.setAttribute('data-adnode-slot', identifier);\n    document.currentScript && document.currentScript.parentNode && document.currentScript.parentNode.insertBefore(mount, document.currentScript);\n  }\n  mount.innerHTML = '';\n  var frame = document.createElement('iframe');\n  frame.src = origin + '/api/embed?mode=frame&slotId=' + encodeURIComponent(identifier);\n  frame.loading = 'lazy';\n  frame.style.width = '100%';\n  frame.style.minHeight = '280px';\n  frame.style.border = '0';\n  frame.style.borderRadius = '20px';\n  frame.style.overflow = 'hidden';\n  frame.setAttribute('title', 'AdNode Slot ' + identifier);\n  mount.appendChild(frame);\n})();`;
}

export type EmbedLanguage = "script" | "html" | "react" | "next";

function embedFrameSrc(origin: string, slotId: number) {
  return `${origin.replace(/\/$/, "")}/api/embed?mode=frame&slotId=${slotId}`;
}

/** Plain HTML: drop-in iframe (no JS). */
export function buildEmbedHtml(origin: string, slotId: number) {
  const src = embedFrameSrc(origin, slotId);
  return `<!-- AdNode slot ${slotId} -->
<iframe
  src="${src}"
  title="AdNode ad ${slotId}"
  loading="lazy"
  style="width:100%;min-height:280px;border:0;border-radius:20px"
/>`;
}

/** React client component (App Router friendly). */
export function buildEmbedReact(origin: string, slotId: number) {
  const src = embedFrameSrc(origin, slotId);
  return `'use client';

import { useEffect, useRef } from "react";

/** AdNode publisher slot #${slotId} */
export function AdNodeAdSlot() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = "";
    const frame = document.createElement("iframe");
    frame.src = ${JSON.stringify(src)};
    frame.loading = "lazy";
    frame.title = "AdNode ad ${slotId}";
    frame.style.width = "100%";
    frame.style.minHeight = "280px";
    frame.style.border = "0";
    frame.style.borderRadius = "20px";
    el.appendChild(frame);
  }, []);
  return <div ref={ref} data-adnode-slot="${slotId}" />;
}
`;
}

/** Next.js: same as React; import into a client page/section. */
export function buildEmbedNext(origin: string, slotId: number) {
  return `${buildEmbedReact(origin, slotId)}
// Usage in app/page.tsx (or any client component):
// import { AdNodeAdSlot } from "@/components/adnode-ad-slot";
// <AdNodeAdSlot />
`;
}

export function buildEmbedForLanguage(lang: EmbedLanguage, origin: string, slotId: number): string {
  switch (lang) {
    case "html":
      return buildEmbedHtml(origin, slotId);
    case "react":
      return buildEmbedReact(origin, slotId);
    case "next":
      return buildEmbedNext(origin, slotId);
    default:
      return buildEmbedScript(origin, slotId);
  }
}
