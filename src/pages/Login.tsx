import { useLocation } from "wouter";
import { RoleCard } from "@/components/shared/RoleCard";
import { WalletConnectionModal } from "@/components/shared/WalletConnectionModal";
import { useAuth } from "@/context/AuthContext";

export function Login() {
  const [, navigate] = useLocation();
  const { setRole } = useAuth();

  const handleSelect = (role: "hoster" | "developer") => {
    setRole(role);
    navigate("/onboarding");
  };

  return (
    <section className="page-shell py-12 sm:py-16">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <WalletConnectionModal />
        <div className="grid gap-6 md:grid-cols-2">
          <RoleCard
            title="Hoster"
            description="Create privacy-aware campaigns, lock MAS escrow, and optimize verified delivery."
            points={["Escrow-backed funding", "Campaign analytics", "CPC, CPM, and hybrid models"]}
            onSelect={() => handleSelect("hoster")}
          />
          <RoleCard
            title="Developer"
            description="Integrate AdNode slots, browse campaigns, and receive automated MAS payouts."
            points={["Framework snippets", "Marketplace access", "Performance earnings dashboard"]}
            onSelect={() => handleSelect("developer")}
          />
        </div>
      </div>
    </section>
  );
}
