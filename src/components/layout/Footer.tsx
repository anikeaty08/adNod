export function Footer() {
  return (
    <footer className="mt-16 border-t border-white/20 bg-white/55 py-12 backdrop-blur-xl dark:border-white/5 dark:bg-slate-950/45">
      <div className="page-shell grid gap-8 lg:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <div>
          <p className="font-display text-xl font-semibold">AdNode</p>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">
            Commercial-grade decentralized advertising for wallet-native apps, dApps, and publisher ecosystems.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">Platform</p>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            <p>Hoster dashboard</p>
            <p>Developer marketplace</p>
            <p>Snippet documentation</p>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">Links</p>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            <a className="hover:text-foreground" href="https://github.com/anikeaty08/adNod" target="_blank" rel="noreferrer">
              GitHub repository
            </a>
            <a
              className="hover:text-foreground"
              href="https://sepolia.arbiscan.io/address/0x93f5A88d41060f5c3E046849d59363FbA87E9813"
              target="_blank"
              rel="noreferrer"
            >
              AdRegistry explorer
            </a>
            <a className="hover:text-foreground" href="https://cofhe-docs.fhenix.zone/" target="_blank" rel="noreferrer">
              Fhenix CoFHE docs
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
