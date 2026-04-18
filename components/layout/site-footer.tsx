import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[color-mix(in_srgb,var(--text)_10%,transparent)] bg-[color-mix(in_srgb,var(--bg)_96%,var(--accent)_4%)]">
      <div className="container grid gap-10 py-14 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <p className="font-display text-lg font-semibold text-[var(--text)]">AdNode</p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
            We&apos;re building confidential ad settlement: advertisers keep strategy private where the chain allows it, while
            payouts stay tied to clear CPC/CPM rules in wei so publishers and auditors can trust the math — not a black box.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Product</p>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            <li>
              <Link href="/app/studio/create" className="cursor-pointer hover:text-[var(--text)]">
                Studio
              </Link>
            </li>
            <li>
              <Link href="/app/studio/campaigns" className="cursor-pointer hover:text-[var(--text)]">
                Your campaigns
              </Link>
            </li>
            <li>
              <Link href="/app/publisher" className="cursor-pointer hover:text-[var(--text)]">
                Publisher / embed
              </Link>
            </li>
            <li>
              <Link href="/app/account" className="cursor-pointer hover:text-[var(--text)]">
                Account & finance
              </Link>
            </li>
            <li>
              <Link href="/docs" className="cursor-pointer hover:text-[var(--text)]">
                Documentation
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Why it matters</p>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted">
            <li>EVM + Fhenix CoFHE for encrypted budgets and bids.</li>
            <li>Embeds and API for real publisher inventory.</li>
            <li>One wallet flow: fund, assign, earn, withdraw.</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[color-mix(in_srgb,var(--text)_8%,transparent)] py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} AdNode · Built for transparent settlement & confidential economics.
      </div>
    </footer>
  );
}
