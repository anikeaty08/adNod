import { Link, useLocation } from "wouter";
import { Menu, Orbit } from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Button } from "@/components/shared/Button";
import { useWallet } from "@/context/WalletContext";
import { useAuth } from "@/context/AuthContext";
import { truncateMiddle } from "@/lib/utils";

const baseNavLinks = [
  { href: "/", label: "Home" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/docs", label: "Docs" },
  { href: "/innovation-hub", label: "Platform" },
];

export function Navbar() {
  const [location] = useLocation();
  const { connected, address, connect, isConnecting } = useWallet();
  const { role } = useAuth();
  const navLinks = role ? [...baseNavLinks, { href: "/profile", label: "Profile" }] : baseNavLinks;

  return (
    <header className="sticky top-0 z-40 border-b border-white/20 bg-white/55 backdrop-blur-xl dark:border-white/5 dark:bg-slate-950/45">
      <div className="page-shell flex h-20 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-300 p-2 text-white">
            <Orbit className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold">AdNode</p>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Fhenix Ad Exchange</p>
          </div>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-4 py-2 text-sm transition ${
                location === link.href
                  ? "bg-sky-500 text-white"
                  : "text-muted-foreground hover:bg-white/60 hover:text-foreground dark:hover:bg-white/5"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" className="md:hidden rounded-full px-3 py-3" aria-label="Open navigation">
            <Menu className="h-4 w-4" />
          </Button>
          {connected ? (
            <div className="hidden rounded-full bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-200 sm:block">
              {truncateMiddle(address ?? "")}
            </div>
          ) : (
            <Button className="hidden sm:inline-flex" onClick={() => void connect()} disabled={isConnecting}>
              {isConnecting ? "Connecting..." : "Connect Wallet"}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
