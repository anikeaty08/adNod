import { useMemo, useState } from "react";
import { Button } from "@/components/shared/Button";

const snippets = {
  html: `<script src="https://cdn.adnode.dev/embed.js"></script>
<div id="adnode-slot" data-campaign="CMP-4021"></div>
<script>
  AdNode.mount({
    slotId: "adnode-slot",
    developer: "0xYourDeveloperWallet",
    endpoint: "https://relay.adnode.dev"
  });
</script>`,
  react: `import { useEffect } from "react";

export function AdSlot() {
  useEffect(() => {
    window.AdNode?.mount({
      slotId: "adnode-slot",
      developer: "0xYourDeveloperWallet",
      endpoint: "https://relay.adnode.dev",
    });
  }, []);

  return <div id="adnode-slot" data-campaign="CMP-4021" />;
}`,
  nextjs: `"use client";
import Script from "next/script";

export default function AdNodeSlot() {
  return (
    <>
      <Script src="https://cdn.adnode.dev/embed.js" strategy="afterInteractive" />
      <div id="adnode-slot" data-campaign="CMP-4021" />
    </>
  );
}`,
  vue: `<template>
  <div id="adnode-slot" data-campaign="CMP-4021" />
</template>

<script setup>
import { onMounted } from "vue";

onMounted(() => {
  window.AdNode?.mount({
    slotId: "adnode-slot",
    developer: "0xYourDeveloperWallet",
    endpoint: "https://relay.adnode.dev"
  });
});
</script>`,
  python: `from flask import Flask, render_template_string

app = Flask(__name__)

@app.get("/")
def ad_slot():
    return render_template_string("""
    <script src='https://cdn.adnode.dev/embed.js'></script>
    <div id='adnode-slot' data-campaign='CMP-4021'></div>
    """)`,
  php: `<?php
echo "<script src='https://cdn.adnode.dev/embed.js'></script>";
echo "<div id='adnode-slot' data-campaign='CMP-4021'></div>";
?>`,
};

type SnippetKey = keyof typeof snippets;

export function SnippetGenerator() {
  const [selected, setSelected] = useState<SnippetKey>("html");
  const snippet = useMemo(() => snippets[selected], [selected]);

  return (
    <div className="glass-panel rounded-[32px] p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-display text-2xl font-semibold">Integration snippet generator</h3>
          <p className="mt-2 text-sm text-muted-foreground">Deliver ads in HTML, React, Next.js, Vue, Python, or PHP.</p>
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
      <pre className="mt-6 overflow-x-auto rounded-[28px] bg-slate-950 p-6 font-mono text-sm leading-6 text-sky-100">
        <code>{snippet}</code>
      </pre>
      <Button className="mt-5" onClick={() => void navigator.clipboard.writeText(snippet)}>
        Copy snippet
      </Button>
    </div>
  );
}
