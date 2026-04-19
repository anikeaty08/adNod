"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { usePathname } from "next/navigation";
import { useChainId } from "wagmi";
import type { LucideIcon } from "lucide-react";
import { BookOpen, Clapperboard, Home, LayoutGrid, LayoutTemplate, PlusCircle, Wallet } from "lucide-react";
import { ADNODE_CHAIN_ID, adnodeChain } from "@/lib/chain";
import { ThemeSwitcher } from "./theme-switcher";
import { AdNodeLogo } from "@/components/brand/adnode-logo";
import { HoverFlipText } from "@/components/ui/hover-flip-text";

const studioLinks: readonly { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/app/studio", label: "Studio", icon: Clapperboard },
  { href: "/app/studio/create", label: "New campaign", icon: PlusCircle },
  { href: "/app/studio/campaigns", label: "Your campaigns", icon: LayoutGrid },
] as const;

const publisherStudioLinks: readonly { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/app/studio/publisher", label: "Home", icon: Home },
  { href: "/app/studio/publisher/campaigns", label: "Campaigns", icon: LayoutGrid },
  { href: "/app/studio/publisher/slots", label: "Publisher slot", icon: LayoutTemplate },
  { href: "/app/studio/publisher/embeds", label: "Embeds", icon: LayoutGrid },
  { href: "/app/studio/publisher/earnings", label: "Earnings", icon: Wallet },
] as const;

/** Shown on marketing home, docs, and /app routes outside Studio. */
const browseLinks: readonly { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/app/studio", label: "Studio", icon: Clapperboard },
  { href: "/app/account", label: "Account", icon: Wallet },
  { href: "/docs", label: "Docs", icon: BookOpen },
] as const;

function linkActive(pathname: string | null, href: string, mode: "studio" | "browse"): boolean {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";

  if (mode === "studio") {
    if (href === "/app/studio/publisher") return pathname === "/app/studio/publisher" || pathname.startsWith("/app/studio/publisher/");
    if (href === "/app/studio/campaigns") return pathname.startsWith("/app/studio/campaigns");
    if (href === "/app/studio") return pathname === "/app/studio";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  if (href === "/docs") return pathname === "/docs" || pathname.startsWith("/docs/");
  if (href === "/app/account") return pathname.startsWith("/app/account");
  if (href === "/app/studio") return pathname.startsWith("/app/studio");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Nav() {
  const pathname = usePathname();
  const chainId = useChainId();
  const ok = chainId === ADNODE_CHAIN_ID;
  const studioMode = pathname?.startsWith("/app/studio") ?? false;
  const publisherStudioMode = pathname?.startsWith("/app/studio/publisher") ?? false;
  const studioHomeMode = pathname === "/app/studio";
  const links = studioMode
    ? studioHomeMode
      ? studioLinks.slice(0, 2)
      : publisherStudioMode
        ? publisherStudioLinks
        : studioLinks
    : browseLinks;
  const mode = studioMode ? "studio" : "browse";

  return (
    <header className="sticky top-0 z-40 border-b border-[color-mix(in_srgb,var(--text)_8%,transparent)] bg-[color-mix(in_srgb,var(--bg)_92%,transparent)] backdrop-blur-md">
      <nav className="container flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3 md:gap-5">
          <Link href="/" className="flex shrink-0 cursor-pointer items-center gap-2 text-[var(--text)] hover:opacity-90">
            <AdNodeLogo className="h-8 w-auto text-[var(--text)]" />
          </Link>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1 sm:gap-2">
            {links.map(({ href, label, icon: Icon }) => {
              const active = linkActive(pathname, href, mode);
              return (
                <Link
                  key={`${mode}-${href}`}
                  href={href}
                  className={`group flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3 ${
                    active
                      ? "bg-accent/25 text-[var(--text)]"
                      : "text-muted hover:bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] hover:text-[var(--text)]"
                  }`}
                >
                  <Icon size={17} strokeWidth={1.75} />
                  <HoverFlipText text={label} className="max-w-[7.5rem] truncate sm:max-w-none" />
                </Link>
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
          <ThemeSwitcher />
          <span className="hidden text-xs text-muted lg:inline">
            <span style={{ color: ok ? "var(--success, #22c55e)" : "var(--warning, #f59e0b)" }}>●</span> {ok ? adnodeChain.name : "Network"}
          </span>
          <ConnectButton showBalance={false} />
        </div>
      </nav>
    </header>
  );
}
