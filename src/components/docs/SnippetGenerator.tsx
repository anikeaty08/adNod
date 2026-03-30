import { useMemo, useState } from "react";
import { Button } from "@/components/shared/Button";

const snippets = {
  html: `<!-- SDK embed is not public yet -->
<!-- Wave 3 will ship a same-origin AdNode slot loader -->
<div data-adnode-slot="coming-soon"></div>`,
  react: `export function AdSlotComingSoon() {
  return (
    <div data-adnode-slot="coming-soon">
      AdNode SDK is scheduled for Wave 3.
    </div>
  );
}`,
  nextjs: `export default function AdNodeSlotComingSoon() {
  return <div data-adnode-slot="coming-soon">SDK coming in Wave 3.</div>;
}`,
  vue: `<template>
  <div data-adnode-slot="coming-soon">SDK coming in Wave 3.</div>
</template>`,
  python: `# SDK embed is not public yet.
# Use the Developer dashboard to register slots until Wave 3 ships.`,
  php: `<?php
echo "AdNode SDK is coming in Wave 3.";
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
          <p className="mt-2 text-sm text-muted-foreground">Preview the planned SDK shape without exposing fake endpoints or dead embed URLs.</p>
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
      <p className="mt-4 text-sm text-muted-foreground">The live browser SDK is not public in this build yet, so these examples are intentionally marked as coming soon.</p>
      <Button className="mt-5" onClick={() => void navigator.clipboard.writeText(snippet)}>
        Copy snippet
      </Button>
    </div>
  );
}
