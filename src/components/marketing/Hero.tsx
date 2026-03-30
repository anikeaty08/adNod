import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, ShieldEllipsis, Sparkles } from "lucide-react";
import { SectionBadge } from "@/components/shared/SectionBadge";
import { Button } from "@/components/shared/Button";
import type { ContractCampaign } from "@/lib/fhenix-contract";

export function Hero({ campaigns }: { campaigns: ContractCampaign[] }) {
  const activeCampaigns = campaigns.filter((campaign) => campaign.status === "active").length;
  const totalHosters = new Set(campaigns.map((campaign) => campaign.advertiser).filter(Boolean)).size;
  const categories = new Set(campaigns.map((campaign) => campaign.category).filter(Boolean)).size;
  const liveStats = [
    { label: "Live campaigns", value: String(campaigns.length), delta: campaigns.length ? "Read from AdRegistry" : "Contract feed is empty" },
    { label: "Active campaigns", value: String(activeCampaigns), delta: campaigns.length ? "Open for publisher slots" : "Create the first one" },
    { label: "Hoster wallets", value: String(totalHosters), delta: campaigns.length ? "Unique campaign owners" : "Waiting for first wallet" },
    { label: "Content categories", value: String(categories), delta: campaigns.length ? "Public campaign metadata" : "No categories yet" },
  ];

  return (
    <section className="page-shell py-14 sm:py-20">
      <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <SectionBadge>Privacy-native ad infrastructure</SectionBadge>
          <h1 className="mt-6 max-w-3xl font-display text-5xl font-semibold tracking-tight sm:text-6xl">
            Launch, settle, and scale blockchain advertising with transparent on-chain trust.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            AdNode connects Hosters and Developers through encrypted Fhenix workflows, escrow-backed delivery,
            and modern dashboards that make decentralized ad operations feel productized.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/login">
              <Button className="w-full sm:w-auto">
                Enter platform
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button variant="secondary" className="w-full sm:w-auto">
                Explore marketplace
              </Button>
            </Link>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { icon: ShieldEllipsis, label: "Escrow-backed campaign funding" },
              { icon: Sparkles, label: "SaaS-grade analytics and UX" },
              { icon: ArrowRight, label: "Multi-framework publisher snippets" },
            ].map((item) => (
              <div key={item.label} className="rounded-[24px] border border-white/30 bg-white/60 p-4 backdrop-blur dark:border-white/5 dark:bg-white/5">
                <item.icon className="h-5 w-5 text-sky-500" />
                <p className="mt-3 text-sm font-medium">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="glass-panel relative overflow-hidden rounded-[32px] p-6"
        >
          <div className="absolute inset-0 bg-hero-grid bg-[length:32px_32px] opacity-40" />
          <div className="relative grid gap-4 sm:grid-cols-2">
            {liveStats.map((item) => (
              <div key={item.label} className="rounded-[24px] bg-white/80 p-5 dark:bg-slate-900/60">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="mt-3 font-display text-2xl font-semibold">{item.value}</p>
                <p className="mt-2 text-sm text-sky-600 dark:text-sky-300">{item.delta}</p>
              </div>
            ))}
          </div>
          <div className="relative mt-4 rounded-[28px] bg-gradient-to-br from-sky-600 via-sky-500 to-cyan-400 p-6 text-white">
            <p className="text-sm uppercase tracking-[0.2em] text-white/70">Encrypted financial layer</p>
            <p className="mt-3 font-display text-3xl font-semibold">Confidential by default</p>
            <p className="mt-2 text-sm text-white/80">
              {campaigns.length
                ? "Budgets, bids, and analytics stay encrypted on-chain while creatives remain publicly discoverable."
                : "Campaign counts will appear here after the first on-chain listing is created."}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
