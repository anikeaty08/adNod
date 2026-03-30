import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { AiAssistantWidget } from "@/components/platform/AiAssistantWidget";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <Navbar />
      <main>{children}</main>
      <Footer />
      <AiAssistantWidget />
    </div>
  );
}
