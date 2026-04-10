import { useMemo, useState } from "react";
import { Button } from "@/components/shared/Button";
import { useSlots } from "@/hooks/useCampaigns";
import { useWallet } from "@/context/WalletContext";

type SnippetKey = "html" | "react" | "nextjs" | "vue" | "python" | "php";
type SnippetMap = Record<SnippetKey, string>;

export function SnippetGenerator() {
  const { data: slots = [] } = useSlots();
  const { address } = useWallet();
  const [selected, setSelected] = useState<SnippetKey>("html");
  const [slotId, setSlotId] = useState("");
  const ownedSlots = address ? slots.filter((slot) => slot.developer.toLowerCase() === address.toLowerCase()) : [];
  const activeSlotId = slotId || ownedSlots[0]?.chainSlotId || "";
  const origin = typeof window !== "undefined" ? window.location.origin : "https://your-adnode-domain.com";

  const snippets = useMemo<SnippetMap>(
    () => ({
      html: `<div data-adnode-slot="${activeSlotId || "YOUR_SLOT_ID"}"></div>
<script async src="${origin}/api/embed.js?slotId=${activeSlotId || "YOUR_SLOT_ID"}"></script>`,
      react: `import { useEffect, useRef } from "react";

export function AdNodeSlot() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.async = true;
    script.src = "${origin}/api/embed.js?slotId=${activeSlotId || "YOUR_SLOT_ID"}";
    ref.current?.appendChild(script);
    return () => script.remove();
  }, []);

  return <div ref={ref} data-adnode-slot="${activeSlotId || "YOUR_SLOT_ID"}" />;
}`,
      nextjs: `"use client";
import { useEffect, useRef } from "react";

export default function AdNodeSlot() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.async = true;
    script.src = "${origin}/api/embed.js?slotId=${activeSlotId || "YOUR_SLOT_ID"}";
    ref.current?.appendChild(script);
    return () => script.remove();
  }, []);

  return <div ref={ref} data-adnode-slot="${activeSlotId || "YOUR_SLOT_ID"}" />;
}`,
      vue: `<template>
  <div ref="slot" data-adnode-slot="${activeSlotId || "YOUR_SLOT_ID"}"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from "vue";

const slot = ref(null);
let script;

onMounted(() => {
  script = document.createElement("script");
  script.async = true;
  script.src = "${origin}/api/embed.js?slotId=${activeSlotId || "YOUR_SLOT_ID"}";
  slot.value?.appendChild(script);
});

onBeforeUnmount(() => script?.remove());
</script>`,
      python: `# Server-rendered HTML example
html = """
<div data-adnode-slot="${activeSlotId || "YOUR_SLOT_ID"}"></div>
<script async src="${origin}/api/embed.js?slotId=${activeSlotId || "YOUR_SLOT_ID"}"></script>
"""`,
      php: `<?php
echo '<div data-adnode-slot="${activeSlotId || "YOUR_SLOT_ID"}"></div>';
echo '<script async src="${origin}/api/embed.js?slotId=${activeSlotId || "YOUR_SLOT_ID"}"></script>';
?>`,
    }),
    [activeSlotId, origin],
  );

  const snippet = useMemo(() => snippets[selected], [selected, snippets]);

  return (
    <div className="glass-panel rounded-[32px] p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-display text-2xl font-semibold">Integration snippet generator</h3>
          <p className="mt-2 text-sm text-muted-foreground">Generate a live AdNode embed snippet for an active campaign and serve its public creative on external sites.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(snippets) as SnippetKey[]).map((key) => (
            <button
              key={key}
              className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition ${
                selected === key ? "bg-sky-500 text-white" : "bg-white/70 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10"
              }`}
              onClick={() => setSelected(key)}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span>Slot</span>
          <select className="w-full rounded-2xl border bg-white/80 px-4 py-3 dark:bg-slate-950/50" value={activeSlotId} onChange={(event) => setSlotId(event.target.value)}>
            {ownedSlots.length ? (
              ownedSlots.map((slot) => (
                <option key={slot.chainSlotId} value={slot.chainSlotId}>
                  {slot.siteName || `Slot ${slot.chainSlotId}`} ({slot.chainSlotId})
                </option>
              ))
            ) : (
              <option value="">Create a slot first</option>
            )}
          </select>
        </label>
        <div className="rounded-[24px] bg-white/70 px-5 py-4 text-sm text-muted-foreground dark:bg-white/5">
          This snippet loads the assigned campaign for slot <span className="font-semibold">{activeSlotId || "YOUR_SLOT_ID"}</span> from <span className="font-mono text-xs">{origin}</span>.
        </div>
      </div>
      <pre className="mt-6 overflow-x-auto rounded-[28px] bg-slate-950 p-6 font-mono text-sm leading-6 text-sky-100">
        <code>{snippet}</code>
      </pre>
      <p className="mt-4 text-sm text-muted-foreground">The embed now resolves the campaign through the slot assignment path instead of letting a publisher hardcode any campaign id.</p>
      <Button className="mt-5" onClick={() => void navigator.clipboard.writeText(snippet)} disabled={!activeSlotId}>
        Copy snippet
      </Button>
    </div>
  );
}
