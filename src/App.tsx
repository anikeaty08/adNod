import { AnimatePresence, motion } from "framer-motion";
import { Route, Switch, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { IntroVideo } from "@/components/marketing/IntroVideo";
import { Landing } from "@/pages/Landing";
import { Login } from "@/pages/Login";
import { Onboarding } from "@/pages/Onboarding";
import { HosterDashboard } from "@/pages/HosterDashboard";
import { DeveloperDashboard } from "@/pages/DeveloperDashboard";
import { Marketplace } from "@/pages/Marketplace";
import { InnovationHub } from "@/pages/InnovationHub";
import { Docs } from "@/pages/Docs";

export default function App() {
  const [location] = useLocation();
  const [showIntro, setShowIntro] = useState(() => !sessionStorage.getItem("adnode:introSeen"));

  useEffect(() => {
    document.title = "AdNode | Decentralized Ad Infrastructure";
  }, []);

  const handleIntroFinish = () => {
    sessionStorage.setItem("adnode:introSeen", "true");
    setShowIntro(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AnimatePresence mode="wait">
        {showIntro ? (
          <IntroVideo key="intro" onComplete={handleIntroFinish} />
        ) : (
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <AppShell>
              <Switch>
                <Route path="/" component={Landing} />
                <Route path="/login" component={Login} />
                <Route path="/onboarding" component={Onboarding} />
                <Route path="/hoster" component={HosterDashboard} />
                <Route path="/developer" component={DeveloperDashboard} />
                <Route path="/marketplace" component={Marketplace} />
                <Route path="/innovation-hub" component={InnovationHub} />
                <Route path="/docs" component={Docs} />
                <Route component={Landing} />
              </Switch>
            </AppShell>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
