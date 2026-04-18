"use client";

import { GradientMesh } from "@/components/ui/gradient-mesh";
import { ConnectGate } from "@/components/web3/connect-gate";

/** Studio requires a connected wallet; other /app routes stay open so people can open Account or Publisher first. */
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GradientMesh />
      <ConnectGate>
        <div className="pb-12 pt-2">{children}</div>
      </ConnectGate>
    </>
  );
}
