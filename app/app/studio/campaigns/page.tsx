"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { Filter, Search } from "lucide-react";
import { getJson } from "@/lib/adnode-api";
import { useHydrated } from "@/lib/use-hydrated";
import { GlassPanel } from "@/components/ui/glass-panel";
import { Field, TextInput, Select } from "@/components/ui/field";

type CampaignRow = {
  chainCampaignId?: string;
  title?: string;
  description?: string;
  category?: string;
  pricingModel?: string;
  rate?: string;
  advertiser?: string;
  creativeURI?: string;
  createdAt?: string;
};

type SortKey = "newest" | "oldest" | "title_az" | "title_za" | "category_az" | "rate_high" | "rate_low";
type PricingFilter = "all" | "CPC" | "CPM";

function parseCreatedAt(row: CampaignRow): number {
  const raw = row.createdAt;
  if (!raw) return 0;
  const t = Date.parse(raw);
  return Number.isFinite(t) ? t : 0;
}

function parseRateEther(row: CampaignRow): number {
  const r = parseFloat(String(row.rate ?? "0"));
  return Number.isFinite(r) ? r : 0;
}

export default function StudioCampaignsPage() {
  const { address } = useAccount();
  const hydrated = useHydrated();
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [loadErr, setLoadErr] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [pricing, setPricing] = useState<PricingFilter>("all");
  const [advertiserScope, setAdvertiserScope] = useState<"mine" | "all">("mine");
  const [sort, setSort] = useState<SortKey>("newest");

  const load = useCallback(async () => {
    setLoadErr("");
    try {
      const c = await getJson<CampaignRow[]>("/api/campaigns");
      setRows(Array.isArray(c) ? c : []);
    } catch (e) {
      setRows([]);
      setLoadErr(e instanceof Error ? e.message : "Could not load campaigns.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) {
      const c = (r.category ?? "").trim();
      if (c) s.add(c);
    }
    return ["all", ...[...s].sort((a, b) => a.localeCompare(b))];
  }, [rows]);

  const filtered = useMemo(() => {
    let list = [...rows];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const id = String(r.chainCampaignId ?? "").toLowerCase();
        const title = (r.title ?? "").toLowerCase();
        const desc = (r.description ?? "").toLowerCase();
        const cat = (r.category ?? "").toLowerCase();
        return id.includes(q) || title.includes(q) || desc.includes(q) || cat.includes(q);
      });
    }
    if (category !== "all") {
      list = list.filter((r) => (r.category ?? "").toLowerCase() === category.toLowerCase());
    }
    if (pricing !== "all") {
      list = list.filter((r) => (r.pricingModel ?? "").toUpperCase() === pricing);
    }
    if (advertiserScope === "mine" && address) {
      const a = address.toLowerCase();
      list = list.filter((r) => (r.advertiser ?? "").toLowerCase() === a);
    }

    list.sort((x, y) => {
      switch (sort) {
        case "oldest":
          return parseCreatedAt(x) - parseCreatedAt(y);
        case "newest":
          return parseCreatedAt(y) - parseCreatedAt(x);
        case "title_az":
          return (x.title ?? "").localeCompare(y.title ?? "", undefined, { sensitivity: "base" });
        case "title_za":
          return (y.title ?? "").localeCompare(x.title ?? "", undefined, { sensitivity: "base" });
        case "category_az":
          return (x.category ?? "").localeCompare(y.category ?? "", undefined, { sensitivity: "base" });
        case "rate_high":
          return parseRateEther(y) - parseRateEther(x);
        case "rate_low":
          return parseRateEther(x) - parseRateEther(y);
        default:
          return 0;
      }
    });
    return list;
  }, [rows, search, category, pricing, advertiserScope, address, sort]);

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--text)] md:text-3xl">Your campaigns</h1>
        <p className="mt-1 text-sm text-muted">Filter and sort API metadata. Chain ids link to detail when available.</p>
      </header>

      <GlassPanel className="mb-6 space-y-4 p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-[var(--text)]">
          <Filter size={16} className="text-muted" />
          Filters & sort
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Search">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <TextInput
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Title, description, id, category…"
              />
            </div>
          </Field>
          <Field label="Category">
            <Select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "all" ? "All categories" : c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Pricing model">
            <Select value={pricing} onChange={(e) => setPricing(e.target.value as PricingFilter)}>
              <option value="all">All</option>
              <option value="CPC">CPC only</option>
              <option value="CPM">CPM only</option>
            </Select>
          </Field>
          <Field label="Advertiser scope">
            <Select value={advertiserScope} onChange={(e) => setAdvertiserScope(e.target.value as "mine" | "all")}>
              <option value="mine">My wallet only</option>
              <option value="all">Everyone (browse)</option>
            </Select>
          </Field>
          <Field label="Sort by">
            <Select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
              <option value="newest">Time · Newest first</option>
              <option value="oldest">Time · Oldest first</option>
              <option value="title_az">Title · A → Z</option>
              <option value="title_za">Title · Z → A</option>
              <option value="category_az">Category · A → Z</option>
              <option value="rate_high">Public rate · High → Low</option>
              <option value="rate_low">Public rate · Low → High</option>
            </Select>
          </Field>
        </div>
        <p className="text-xs text-muted">
          Showing <strong className="text-[var(--text)]">{filtered.length}</strong> of {rows.length} loaded.
        </p>
      </GlassPanel>

      {loadErr ? <p className="mb-4 text-sm text-amber-300">{loadErr}</p> : null}

      {!address && advertiserScope === "mine" ? (
        <GlassPanel className="p-6 text-sm text-muted">Connect your wallet to list campaigns for your address.</GlassPanel>
      ) : filtered.length === 0 ? (
        <GlassPanel className="p-6 text-sm text-muted">No campaigns match these filters.</GlassPanel>
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => (
            <li key={String(r.chainCampaignId)}>
              <Link
                href={`/app/studio/campaigns/${encodeURIComponent(String(r.chainCampaignId ?? ""))}`}
                className="block cursor-pointer rounded-xl border border-border bg-[color-mix(in_srgb,var(--surface-solid)_95%,transparent)] p-4 transition hover:border-accent/50 hover:bg-[color-mix(in_srgb,var(--accent)_8%,var(--surface-solid))]"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-xs text-muted">#{r.chainCampaignId}</p>
                    <p className="font-display text-lg font-semibold text-[var(--text)]">{r.title ?? "Untitled"}</p>
                    <p className="mt-1 text-sm text-muted">
                      {r.category ?? "—"} · {r.pricingModel ?? "—"} · rate {r.rate ?? "—"}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted">
                    <span suppressHydrationWarning>{hydrated && r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
