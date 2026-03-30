import { SnippetGenerator } from "@/components/docs/SnippetGenerator";
import { SectionBadge } from "@/components/shared/SectionBadge";
import { fhenixContractNotes } from "@/lib/fhenix-contract";

export function Docs() {
  return (
    <section className="page-shell py-12 sm:py-16">
      <SectionBadge>Developer docs</SectionBadge>
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl font-semibold">Ship AdNode slots in minutes.</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Copy snippets, route signed events to your settlement layer, and adapt the provided Fhenix contract adapter to the official SDK.
          </p>
        </div>
        <div className="rounded-[24px] bg-white/70 px-5 py-4 text-sm text-muted-foreground dark:bg-white/5">
          {fhenixContractNotes.status}
        </div>
      </div>
      <div className="mt-8">
        <SnippetGenerator />
      </div>
    </section>
  );
}
