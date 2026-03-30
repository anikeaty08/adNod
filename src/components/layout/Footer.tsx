export function Footer() {
  return (
    <footer className="border-t border-white/20 py-10 dark:border-white/5">
      <div className="page-shell flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-lg font-semibold">AdNode</p>
          <p className="text-sm text-muted-foreground">Commercial-grade decentralized advertising for Fhenix-native apps.</p>
        </div>
        <div className="text-sm text-muted-foreground">
          Escrowed settlement, transparent delivery, multi-framework integration snippets.
        </div>
      </div>
    </footer>
  );
}
