import { Link, useLocation } from "wouter";
import { Menu, Orbit, QrCode, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Button } from "@/components/shared/Button";
import { useWallet } from "@/context/WalletContext";
import { useAuth } from "@/context/AuthContext";
import { truncateMiddle } from "@/lib/utils";

const baseNavLinks = [
  { href: "/", label: "Home" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/docs", label: "Docs" },
];

export function Navbar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const iconRef = useRef<HTMLDivElement | null>(null);
  const {
    connected,
    address,
    connectWalletConnect,
    disconnect,
    isConnecting,
    isWalletConnectReady,
  } = useWallet();
  const { role } = useAuth();
  const navLinks = role ? [...baseNavLinks, { href: "/profile", label: "Profile" }] : baseNavLinks;

  useEffect(() => {
    if (!iconRef.current) return;

    const timeline = gsap.timeline({ repeat: -1, repeatDelay: 2.5 });
    timeline.to(iconRef.current, { rotate: 180, duration: 1.8, ease: "power2.inOut" }).to(iconRef.current, {
      scale: 1.08,
      duration: 0.45,
      yoyo: true,
      repeat: 1,
      ease: "sine.inOut",
    });

    return () => {
      timeline.kill();
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-white/20 bg-white/55 backdrop-blur-xl dark:border-white/5 dark:bg-slate-950/45">
      <div className="page-shell flex h-20 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          <div ref={iconRef} className="rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-300 p-2 text-white shadow-lg shadow-sky-500/20">
            <Orbit className="h-5 w-5" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold">AdNode</p>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Fhenix Testnet Ads</p>
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
          <Button
            variant="ghost"
            className="md:hidden rounded-full px-3 py-3"
            aria-label="Open navigation"
            onClick={() => setMobileOpen((value) => !value)}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
          {connected ? (
            <>
              <div className="hidden rounded-full bg-sky-50 px-4 py-2 text-sm font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-200 sm:block">
                {truncateMiddle(address ?? "")}
              </div>
              <Button variant="secondary" className="hidden sm:inline-flex" onClick={() => disconnect()}>
                Disconnect
              </Button>
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button onClick={() => void connectWalletConnect()} disabled={isConnecting || !isWalletConnectReady}>
                <QrCode className="mr-2 h-4 w-4" />
                {isConnecting ? "Opening..." : "WalletConnect"}
              </Button>
            </div>
          )}
        </div>
      </div>
      {mobileOpen ? (
        <div className="border-t border-white/20 bg-white/85 px-6 py-5 backdrop-blur-xl dark:border-white/5 dark:bg-slate-950/90 md:hidden">
          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-2xl px-4 py-3 text-sm transition ${
                  location === link.href
                    ? "bg-sky-500 text-white"
                    : "text-muted-foreground hover:bg-white/60 hover:text-foreground dark:hover:bg-white/5"
                }`}
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4">
            {connected ? (
              <div className="space-y-3">
                <div className="rounded-2xl bg-sky-50 px-4 py-3 text-sm font-medium text-sky-700 dark:bg-sky-500/10 dark:text-sky-200">
                  {truncateMiddle(address ?? "")}
                </div>
                <Button variant="secondary" className="w-full" onClick={() => disconnect()}>
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Button className="w-full" onClick={() => void connectWalletConnect()} disabled={isConnecting || !isWalletConnectReady}>
                  <QrCode className="mr-2 h-4 w-4" />
                  {isConnecting ? "Opening..." : "WalletConnect QR"}
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
