/** Match server/public-campaigns.ts buildEmbedScript for client-side preview. */
export function buildEmbedScript(origin: string, options: { slotId?: number; slotKey?: string }) {
  const safeOrigin = JSON.stringify(origin);
  const identifier = options.slotKey ? String(options.slotKey) : String(options.slotId ?? "");
  const param = options.slotKey ? "slotKey" : "slotId";
  return `(function(){\n  var identifier = ${JSON.stringify(identifier)};\n  var origin = ${safeOrigin};\n  var selector = '[data-adnode-slot=\"' + identifier + '\"]';\n  var mount = document.querySelector(selector);\n  if (!mount) {\n    mount = document.createElement('div');\n    mount.setAttribute('data-adnode-slot', identifier);\n    document.currentScript && document.currentScript.parentNode && document.currentScript.parentNode.insertBefore(mount, document.currentScript);\n  }\n  mount.innerHTML = '';\n  var frame = document.createElement('iframe');\n  var sessionKey = 'adnode-session-' + identifier;\n  var sessionId = '';\n  try {\n    sessionId = window.sessionStorage.getItem(sessionKey) || '';\n    if (!sessionId) {\n      sessionId = window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : String(Date.now()) + '-' + Math.random().toString(16).slice(2);\n      window.sessionStorage.setItem(sessionKey, sessionId);\n    }\n  } catch (e) {\n    sessionId = String(Date.now()) + '-' + Math.random().toString(16).slice(2);\n  }\n  var params = 'mode=frame&' + ${JSON.stringify(param)} + '=' + encodeURIComponent(identifier) + '&sessionId=' + encodeURIComponent(sessionId) + '&pageUrl=' + encodeURIComponent(window.location.href) + '&publisherOrigin=' + encodeURIComponent(window.location.origin);\n  frame.src = origin + '/api/embed?' + params;\n  frame.loading = 'lazy';\n  frame.style.width = '100%';\n  frame.style.minHeight = '280px';\n  frame.style.border = '0';\n  frame.style.borderRadius = '20px';\n  frame.style.overflow = 'hidden';\n  frame.setAttribute('title', 'AdNode Slot ' + identifier);\n  mount.appendChild(frame);\n})();`;
}

export type EmbedLanguage = "script" | "html" | "react" | "next";

function embedFrameSrc(origin: string, options: { slotId?: number; slotKey?: string }) {
  const identifier = options.slotKey ? String(options.slotKey) : String(options.slotId ?? "");
  const param = options.slotKey ? "slotKey" : "slotId";
  return `${origin.replace(/\/$/, "")}/api/embed?mode=frame&${param}=${encodeURIComponent(identifier)}`;
}

/** Plain HTML: script-backed install so page/session binding is preserved. */
export function buildEmbedHtml(origin: string, options: { slotId?: number; slotKey?: string }) {
  const label = options.slotKey ? String(options.slotKey) : String(options.slotId ?? "");
  return `<!-- AdNode slot ${label} -->
<div data-adnode-slot="${label}"></div>
<script async src="${origin.replace(/\/$/, "")}/api/embed?${options.slotKey ? "slotKey" : "slotId"}=${encodeURIComponent(label)}"></script>`;
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
    const sessionKey = "adnode-session-${label}";
    let sessionId = window.sessionStorage.getItem(sessionKey);
    if (!sessionId) {
      sessionId = window.crypto.randomUUID();
      window.sessionStorage.setItem(sessionKey, sessionId);
    }
    const url = new URL(${JSON.stringify(src)});
    url.searchParams.set("sessionId", sessionId);
    url.searchParams.set("pageUrl", window.location.href);
    url.searchParams.set("publisherOrigin", window.location.origin);
    const frame = document.createElement("iframe");
    frame.src = url.toString();
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
