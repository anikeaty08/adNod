"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GlassPanel } from "@/components/ui/glass-panel";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Clapperboard, LayoutDashboard, LayoutTemplate, PlusCircle, Wallet } from "lucide-react";

type StudioRole = "advertiser" | "publisher";

const ROLE_KEY = "adnode:studioRole";

export default function StudioHomePage() {
  const router = useRouter();
  const [role, setRole] = useState<StudioRole | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(ROLE_KEY) as StudioRole | null;
      if (saved === "advertiser" || saved === "publisher") setRole(saved);
    } catch {
      // ignore
    }
  }, []);

  const choose = useCallback(
    (next: StudioRole) => {
      setRole(next);
      try {
        window.localStorage.setItem(ROLE_KEY, next);
      } catch {
        // ignore
      }
      router.push(next === "publisher" ? "/app/studio/publisher" : "/app/studio/create");
    },
    [router],
  );

  return (
    <div className="space-y-6">
      <header className="max-w-3xl">
        <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text)] md:text-3xl">AdNode Studio</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Create campaigns, register publisher placements, assign inventory, and withdraw earnings from one wallet workspace.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <GlassPanel className="p-6">
          <div className="flex items-center gap-2 text-[var(--text)]">
            <Clapperboard size={18} />
            <p className="text-sm font-semibold">Advertiser / hoster</p>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted">Create campaigns, upload creatives, fund escrow, and manage live campaign state.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <PrimaryButton onClick={() => choose("advertiser")}>
              <PlusCircle size={17} /> New campaign
            </PrimaryButton>
            <PrimaryButton variant="secondary" href="/app/studio/campaigns">
              View campaigns
            </PrimaryButton>
          </div>
        </GlassPanel>

        <GlassPanel className="p-6">
          <div className="flex items-center gap-2 text-[var(--text)]">
            <LayoutTemplate size={18} />
            <p className="text-sm font-semibold">Publisher / developer</p>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted">Register slots, request campaign access, assign campaigns, and copy embed code.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <PrimaryButton onClick={() => choose("publisher")}>
              <LayoutDashboard size={17} /> Publisher home
            </PrimaryButton>
            <PrimaryButton variant="secondary" href="/app/studio/publisher/earnings">
              <Wallet size={17} /> Earnings
            </PrimaryButton>
          </div>
        </GlassPanel>
      </div>

      {role ? <p className="mt-6 text-xs text-muted">Last used: {role === "publisher" ? "Publisher" : "Advertiser"}.</p> : null}
      <Link href="/docs" className="inline-flex text-sm font-medium text-accent hover:underline">
        Open product docs
      </Link>
    </div>
  );
}

