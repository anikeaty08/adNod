import { Link } from "wouter";
import { Button } from "@/components/shared/Button";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";

export function Onboarding() {
  const { role } = useAuth();
  const { address, network } = useWallet();
  const dashboardLink = role === "hoster" ? "/hoster" : "/developer";

  return (
    <section className="page-shell py-12 sm:py-16">
      <div className="glass-panel mx-auto max-w-3xl rounded-[34px] p-8 sm:p-10">
        <p className="text-sm uppercase tracking-[0.22em] text-sky-700 dark:text-sky-300">Welcome to AdNode</p>
        <h1 className="mt-5 font-display text-4xl font-semibold">Your workspace is ready.</h1>
        <p className="mt-4 text-muted-foreground">
          Role: <span className="font-medium capitalize">{role ?? "developer"}</span>. Wallet:{" "}
          <span className="font-mono text-sm">{address ?? "Connect from login"}</span>. Network: {network ?? "Fhenix Helium"}.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {[
            role === "hoster"
              ? "You can now launch and manage campaigns from the Hoster workspace."
              : "You can now browse campaigns and work from the Developer workspace.",
            "Use the Profile page anytime to review account details and your activity history.",
            "Wallet connection is used for access only here, without any signature prompt.",
          ].map((item) => (
            <div key={item} className="rounded-[24px] bg-white/70 p-5 dark:bg-white/5">
              <p className="text-sm">{item}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link href={dashboardLink}>
            <Button className="w-full sm:w-auto">Open workspace</Button>
          </Link>
          <Link href="/profile">
            <Button variant="secondary" className="w-full sm:w-auto">
              View profile
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
