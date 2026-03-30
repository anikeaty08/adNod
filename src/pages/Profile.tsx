import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";
import { useCampaigns } from "@/hooks/useCampaigns";
import { EmptyState } from "@/components/shared/EmptyState";
import { truncateMiddle } from "@/lib/utils";

export function Profile() {
  const { role } = useAuth();
  const { address, connected, network } = useWallet();
  const { data: campaigns = [] } = useCampaigns();

  const historyItems =
    role === "hoster"
      ? campaigns.filter((campaign) => !address || campaign.advertiser.toLowerCase() === address.toLowerCase())
      : campaigns;

  return (
    <section className="page-shell py-12 sm:py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">Profile</p>
          <h1 className="mt-3 font-display text-4xl font-semibold">Account and history</h1>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Review your wallet session, active role, and recent AdNode activity without going through a separate profile-creation flow.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="glass-panel rounded-[32px] p-7">
          <h2 className="font-display text-2xl font-semibold">Account</h2>
          <div className="mt-6 space-y-4">
            <div className="rounded-[24px] bg-white/70 p-4 dark:bg-white/5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Role</p>
              <p className="mt-2 text-lg font-medium capitalize">{role ?? "Not selected"}</p>
            </div>
            <div className="rounded-[24px] bg-white/70 p-4 dark:bg-white/5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Wallet</p>
              <p className="mt-2 font-mono text-sm">{connected && address ? truncateMiddle(address, 10, 6) : "Not connected"}</p>
            </div>
            <div className="rounded-[24px] bg-white/70 p-4 dark:bg-white/5">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Network</p>
              <p className="mt-2 text-lg font-medium">{network ?? "No network detected"}</p>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-[32px] p-7">
          <h2 className="font-display text-2xl font-semibold">{role === "hoster" ? "Campaign history" : "Marketplace history"}</h2>
          {historyItems.length ? (
            <div className="mt-6 space-y-4">
              {historyItems.map((campaign) => (
                <div key={campaign.id} className="rounded-[24px] bg-white/70 p-4 dark:bg-white/5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{campaign.title}</p>
                    <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:bg-sky-500/10 dark:text-sky-200">
                      {campaign.pricingModel}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{campaign.description}</p>
                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>ID: {campaign.id}</span>
                    <span>Status: {campaign.status}</span>
                    <span>Budget: MAS {campaign.escrowedMas}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState
                title={role === "hoster" ? "No campaign history yet" : "No marketplace history yet"}
                description={
                  role === "hoster"
                    ? "When you create campaigns, they will appear here so you can review your history."
                    : "When campaigns are listed on AdNode, they will appear here for you to track."
                }
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
