import { performanceSeries } from "@/data/mock";
import { MiniBarChart } from "@/components/shared/MiniBarChart";

export function PerformancePanel() {
  return (
    <div className="glass-panel rounded-[32px] p-7">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl font-semibold">Performance trend</h3>
          <p className="mt-2 text-sm text-muted-foreground">Spend, clicks, and impression velocity over the last week.</p>
        </div>
        <div className="rounded-full bg-white/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 dark:bg-white/5 dark:text-sky-200">
          Live analytics
        </div>
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div>
          <p className="mb-4 text-sm text-muted-foreground">Spend index</p>
          <MiniBarChart values={performanceSeries.map((item) => item.spend)} />
        </div>
        <div>
          <p className="mb-4 text-sm text-muted-foreground">Clicks</p>
          <MiniBarChart values={performanceSeries.map((item) => item.clicks)} color="from-cyan-400 to-sky-300" />
        </div>
        <div>
          <p className="mb-4 text-sm text-muted-foreground">Impressions</p>
          <MiniBarChart values={performanceSeries.map((item) => item.impressions)} color="from-blue-500 to-sky-400" />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground">
        {performanceSeries.map((item) => (
          <span key={item.label}>{item.label}</span>
        ))}
      </div>
    </div>
  );
}
