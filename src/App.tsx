import { Route, Switch, useLocation } from "wouter";
import { useEffect, useRef, useState } from "react";
import barba from "@barba/core";
import gsap from "gsap";
import { AppShell } from "@/components/layout/AppShell";
import { IntroVideo } from "@/components/marketing/IntroVideo";
import { Landing } from "@/pages/Landing";
import { Login } from "@/pages/Login";
import { HosterDashboard } from "@/pages/HosterDashboard";
import { DeveloperDashboard } from "@/pages/DeveloperDashboard";
import { Marketplace } from "@/pages/Marketplace";
import { Docs } from "@/pages/Docs";
import { Profile } from "@/pages/Profile";
import { useWallet } from "@/context/WalletContext";
import { useAuth } from "@/context/AuthContext";

function ProtectedRoute({
  expectedRole,
  children,
}: {
  expectedRole: "hoster" | "developer";
  children: React.ReactNode;
}) {
  const [, navigate] = useLocation();
  const { connected } = useWallet();
  const { role } = useAuth();

  useEffect(() => {
    if (!connected || role !== expectedRole) {
      navigate("/login");
    }
  }, [connected, expectedRole, navigate, role]);

  if (!connected || role !== expectedRole) {
    return null;
  }

  return <>{children}</>;
}

export default function App() {
  const [location] = useLocation();
  const routeShellRef = useRef<HTMLDivElement | null>(null);
  const [showIntro, setShowIntro] = useState(() => !sessionStorage.getItem("adnode:introSeen"));
  const previousLocationRef = useRef(location);

  useEffect(() => {
    barba.init({
      preventRunning: true,
      prevent: () => true,
      transitions: [],
    });

    return () => {
      barba.destroy();
    };
  }, []);

  useEffect(() => {
    document.title = "AdNode | Fhenix Testnet Advertising";
  }, []);

  useEffect(() => {
    if (!routeShellRef.current || showIntro) return;
    const runTransition = async () => {
      await barba.hooks.do("beforeLeave", { current: { namespace: previousLocationRef.current } });
      await gsap.to(routeShellRef.current, {
        autoAlpha: 0,
        y: -10,
        filter: "blur(8px)",
        duration: 0.18,
        ease: "power2.in",
      });
      await barba.hooks.do("afterLeave", { current: { namespace: previousLocationRef.current } });
      await barba.hooks.do("beforeEnter", { next: { namespace: location } });
      await gsap.fromTo(
        routeShellRef.current,
        { autoAlpha: 0, y: 18, filter: "blur(8px)" },
        { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.55, ease: "power3.out" },
      );
      await barba.hooks.do("afterEnter", { next: { namespace: location } });
      previousLocationRef.current = location;
    };

    void runTransition();
  }, [location, showIntro]);

  const handleIntroFinish = () => {
    sessionStorage.setItem("adnode:introSeen", "true");
    setShowIntro(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground" data-barba="wrapper">
      {showIntro ? (
        <IntroVideo key="intro" onComplete={handleIntroFinish} />
      ) : (
        <div ref={routeShellRef} key={location} data-barba="container" data-barba-namespace={location}>
          <AppShell>
            <Switch>
              <Route path="/" component={Landing} />
              <Route path="/login" component={Login} />
              <Route path="/hoster">
                <ProtectedRoute expectedRole="hoster">
                  <HosterDashboard />
                </ProtectedRoute>
              </Route>
              <Route path="/developer">
                <ProtectedRoute expectedRole="developer">
                  <DeveloperDashboard />
                </ProtectedRoute>
              </Route>
              <Route path="/profile" component={Profile} />
              <Route path="/marketplace" component={Marketplace} />
              <Route path="/docs" component={Docs} />
              <Route component={Landing} />
            </Switch>
          </AppShell>
        </div>
      )}
    </div>
  );
}
