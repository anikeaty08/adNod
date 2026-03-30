import type { ContractCampaign } from "@/lib/fhenix-contract";
import { formatCompact } from "@/lib/utils";
import { EmptyState } from "@/components/shared/EmptyState";

export function CampaignTable({ campaigns }: { campaigns: ContractCampaign[] }) {
  if (!campaigns.length) {
    return (
      <EmptyState
        title="No campaigns available yet"
        description="Create your first Hoster campaign and it will appear here for Developers to browse."
      />
    );
  }

  return (
    <div className="glass-panel overflow-hidden rounded-[32px]">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/60 dark:bg-white/5">
            <tr>
              {["Campaign", "Model", "Escrow", "Impressions", "Clicks", "Status"].map((heading) => (
                <th key={heading} className="px-6 py-4 font-medium text-muted-foreground">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => (
              <tr key={campaign.id} className="border-t border-white/20 dark:border-white/5">
                <td className="px-6 py-5">
                  <p className="font-medium">{campaign.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{campaign.id}</p>
                </td>
                <td className="px-6 py-5">{campaign.pricingModel}</td>
                <td className="px-6 py-5">MAS {formatCompact(campaign.escrowedMas)}</td>
                <td className="px-6 py-5">{formatCompact(campaign.impressions)}</td>
                <td className="px-6 py-5">{formatCompact(campaign.clicks)}</td>
                <td className="px-6 py-5 capitalize">{campaign.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
