export function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-sky-300/70 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700 dark:border-sky-500/20 dark:bg-sky-400/10 dark:text-sky-200">
      {children}
    </span>
  );
}
