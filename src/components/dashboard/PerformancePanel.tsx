import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ContractCampaign } from "@/lib/fhenix-contract";

export function PerformancePanel({
  campaigns,
  statsByCampaign,
}: {
  campaigns: ContractCampaign[];
  statsByCampaign: Record<string, { budget: string | null; impressions: number | null; clicks: number | null; status: string | null }>;
}) {
  const chartData = campaigns
    .map((campaign) => ({
      title: campaign.title,
      impressions: statsByCampaign[campaign.id]?.impressions,
      clicks: statsByCampaign[campaign.id]?.clicks,
    }))
    .filter((item) => typeof item.impressions === "number" || typeof item.clicks === "number");

  return (
    <div className="glass-panel rounded-[32px] p-7">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl font-semibold">Campaign stats</h3>
          <p className="mt-2 text-sm text-muted-foreground">Each card decrypts independently. This chart updates only from real decrypted campaign stats.</p>
        </div>
        <div className="rounded-full bg-white/70 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 dark:bg-white/5 dark:text-sky-200">
          Encrypted analytics
        </div>
      </div>
      <div className="mt-8 rounded-[24px] bg-white/70 p-5 dark:bg-white/5">
        <p className="text-sm text-muted-foreground">Campaign performance chart</p>
        {chartData.length ? (
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="title" tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" allowDecimals={false} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar yAxisId="left" dataKey="impressions" fill="#1E90FF" radius={[8, 8, 0, 0]} />
                <Bar yAxisId="right" dataKey="clicks" fill="#50C0FF" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-4 rounded-[18px] border border-dashed border-sky-300/70 px-4 py-10 text-center text-sm text-muted-foreground dark:border-sky-500/20">
            Decrypt stats on an individual campaign card to populate the chart.
          </div>
        )}
      </div>
    </div>
  );
}
