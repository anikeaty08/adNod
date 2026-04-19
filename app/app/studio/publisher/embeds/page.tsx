"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PublisherPanel } from "@/components/studio/publisher-panel";
import { GlassPanel } from "@/components/ui/glass-panel";
import { PrimaryButton } from "@/components/ui/primary-button";
import { getJson } from "@/lib/adnode-api";

export default function StudioPublisherEmbedsPage() {
  const params = useSearchParams();
  const slotId = params.get("slotId");
  const live = params.get("live") === "1";
  const [origin, setOrigin] = useState("");
  const [slotKey, setSlotKey] = useState<string | null>(null);
  const [placementName, setPlacementName] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!slotId || !/^\d+$/.test(slotId)) {
      setSlotKey(null);
      setPlacementName(null);
      return;
    }
    void (async () => {
      try {
        const rows = await getJson<Array<Record<string, unknown>>>("/api/slots");
        const match = (rows ?? []).find((r) => String(r.chainSlotId ?? "") === String(slotId));
        setSlotKey(match && typeof match.slotKey === "string" ? match.slotKey : null);
        setPlacementName(match && typeof match.siteName === "string" ? match.siteName : null);
      } catch {
        setSlotKey(null);
        setPlacementName(null);
      }
    })();
  }, [slotId]);

  const snippets = useMemo(() => {
    if (!origin || !slotKey) return null;
    const src = `${origin.replace(/\/$/, "")}/api/embed?mode=frame&slotKey=${encodeURIComponent(slotKey)}`;
    return {
      script: `<script async src="${origin.replace(/\/$/, "")}/api/embed?slotKey=${encodeURIComponent(slotKey)}"></script>`,
      iframe: `<!-- AdNode placement ${slotKey} -->
<iframe
  src="${src}"
  title="AdNode ad"
  loading="lazy"
  style="width:100%;min-height:280px;border:0;border-radius:20px"
></iframe>`,
    };
  }, [origin, slotKey]);

  return (
    <div className="space-y-6">
      <header className="max-w-2xl">
        <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text)] md:text-3xl">Embeds</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">Generate embed code for your placements.</p>
      </header>

      {live ? (
        <GlassPanel className="border-emerald-500/25 bg-emerald-500/10 p-5 md:p-6">
          <p className="text-sm font-semibold text-emerald-100">Your ad is live.</p>
          <p className="mt-1 text-sm text-muted">
            Placement:{" "}
            <span className="font-mono text-[var(--text)]">
              {placementName ? `${placementName} ` : ""}
              {slotKey ? slotKey : slotId ? `#${slotId}` : ""}
            </span>
          </p>
          {snippets ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Script (recommended)</p>
                <textarea
                  className="mt-2 w-full rounded-panel border border-border bg-[var(--bg)] p-3 font-mono text-xs text-[var(--text)]"
                  readOnly
                  rows={5}
                  value={snippets.script}
                />
                <PrimaryButton variant="ghost" className="mt-2" onClick={() => void navigator.clipboard.writeText(snippets.script)}>
                  Copy script
                </PrimaryButton>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Iframe</p>
                <textarea
                  className="mt-2 w-full rounded-panel border border-border bg-[var(--bg)] p-3 font-mono text-xs text-[var(--text)]"
                  readOnly
                  rows={5}
                  value={snippets.iframe}
                />
                <PrimaryButton variant="ghost" className="mt-2" onClick={() => void navigator.clipboard.writeText(snippets.iframe)}>
                  Copy iframe
                </PrimaryButton>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">Select the same placement below to generate the embed snippet.</p>
          )}
        </GlassPanel>
      ) : null}

      <PublisherPanel view="embeds" initialSlotId={slotId} />
    </div>
  );
}
