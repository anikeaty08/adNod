import { useForm } from "react-hook-form";
import { Button } from "@/components/shared/Button";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";
import { useCampaigns } from "@/hooks/useCampaigns";
import { EmptyState } from "@/components/shared/EmptyState";
import { truncateMiddle } from "@/lib/utils";

export function Profile() {
  const { role, profile, setProfile } = useAuth();
  const { address, connected, network } = useWallet();
  const { data: campaigns = [] } = useCampaigns();
  const form = useForm({
    defaultValues: {
      fullName: profile?.fullName ?? "",
      email: profile?.email ?? "",
      organization: profile?.organization ?? "",
      country: profile?.country ?? "",
      bio: profile?.bio ?? "",
    },
  });

  const historyItems =
    role === "hoster"
      ? campaigns.filter((campaign) => !address || campaign.advertiser.toLowerCase() === address.toLowerCase())
      : campaigns;

  const onSubmit = form.handleSubmit((values) => {
    setProfile(values);
  });

  return (
    <section className="page-shell py-12 sm:py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">Profile</p>
          <h1 className="mt-3 font-display text-4xl font-semibold">Account and history</h1>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Manage your personal details, review your wallet session, and check your AdNode activity from one place.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="glass-panel rounded-[32px] p-7">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-2xl font-semibold">Personal info</h2>
            {role ? (
              <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700 dark:bg-sky-500/10 dark:text-sky-200">
                Current workspace: {role}
              </span>
            ) : null}
          </div>

          {!profile ? (
            <p className="mt-3 text-sm text-muted-foreground">
              New here. Add a few personal details so your account feels complete.
            </p>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span>Full name</span>
                <input
                  className="w-full rounded-2xl border bg-white/80 px-4 py-3 dark:bg-slate-950/50"
                  placeholder="Your name"
                  {...form.register("fullName")}
                />
              </label>
              <label className="space-y-2 text-sm">
                <span>Email</span>
                <input
                  className="w-full rounded-2xl border bg-white/80 px-4 py-3 dark:bg-slate-950/50"
                  placeholder="you@example.com"
                  {...form.register("email")}
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span>Organization</span>
                <input
                  className="w-full rounded-2xl border bg-white/80 px-4 py-3 dark:bg-slate-950/50"
                  placeholder="Company, team, or solo brand"
                  {...form.register("organization")}
                />
              </label>
              <label className="space-y-2 text-sm">
                <span>Country</span>
                <input
                  className="w-full rounded-2xl border bg-white/80 px-4 py-3 dark:bg-slate-950/50"
                  placeholder="Country"
                  {...form.register("country")}
                />
              </label>
            </div>
            <label className="space-y-2 text-sm">
              <span>Bio</span>
              <textarea
                className="min-h-24 w-full rounded-2xl border bg-white/80 px-4 py-3 dark:bg-slate-950/50"
                placeholder="Tell us a little about yourself"
                {...form.register("bio")}
              />
            </label>

            <div className="flex flex-col gap-4 pt-2">
              <Button className="w-full sm:w-auto" type="submit">
                {profile ? "Update profile" : "Save profile"}
              </Button>
            </div>
          </form>

          <div className="mt-6 space-y-4">
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
          <h2 className="font-display text-2xl font-semibold">{role === "hoster" ? "Campaign history" : "Activity history"}</h2>
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
                    <span>Category: {campaign.category}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState
                title={role === "hoster" ? "No campaign history yet" : "No activity history yet"}
                description={
                  role === "hoster"
                    ? "When you create campaigns, they will appear here so you can review your history."
                    : "When you start using AdNode, your recent activity and available listings will appear here."
                }
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
