import { ReactNode } from "react";
import { Nav } from "@/components/layout/nav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav />
      <main className="container py-6 md:py-8" style={{ paddingBottom: "3rem" }}>
        {children}
      </main>
    </>
  );
}
