import { useLocation } from "wouter";
import { RoleCard } from "@/components/shared/RoleCard";
import { WalletConnectionModal } from "@/components/shared/WalletConnectionModal";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";

export function Login() {
  const [, navigate] = useLocation();
  const { setRole } = useAuth();
  const { connected } = useWallet();

  const handleSelect = (role: "hoster" | "developer") => {
    if (!connected) {
      return;
    }

    setRole(role);
    navigate(role === "hoster" ? "/hoster" : "/developer");
  };

  return (
    <section className="page-shell py-12 sm:py-16">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <WalletConnectionModal />
        <div className="grid gap-6 md:grid-cols-2">
          <RoleCard
            title="Hoster"
            description="Create privacy-aware campaigns, fund escrow on-chain, and manage owner-only analytics."
            points={["Funded escrow", "Encrypted campaign analytics", "CPC campaigns live today"]}
            onSelect={() => handleSelect("hoster")}
          />
          <RoleCard
            title="Developer"
            description="Integrate AdNode slots, browse funded campaigns, and claim slot-linked payouts."
            points={["Framework snippets", "Marketplace access", "Claimable payout balance"]}
            onSelect={() => handleSelect("developer")}
          />
        </div>
      </div>
      {!connected ? <p className="mt-6 text-sm text-muted-foreground">Connect your wallet first, then choose the workspace you want to open.</p> : null}
    </section>
  );
}
