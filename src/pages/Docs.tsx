import { SnippetGenerator } from "@/components/docs/SnippetGenerator";
import { SectionBadge } from "@/components/shared/SectionBadge";

export function Docs() {
  return (
    <section className="page-shell py-12 sm:py-16">
      <SectionBadge>Developer docs</SectionBadge>
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-semibold">Ship AdNode slots in minutes.</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Copy integration snippets, embed AdNode placements into your app, and move faster across supported frontend stacks.
          </p>
        </div>
        <div className="rounded-[24px] bg-white/70 px-5 py-4 text-sm text-muted-foreground dark:bg-white/5">
          Integration-focused documentation for Developers using AdNode placements across websites, apps, and dApps.
        </div>
      </div>
      <div className="mt-8">
        <SnippetGenerator />
      </div>
    </section>
  );
}
