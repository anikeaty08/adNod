"use client";

import type { ReactNode } from "react";
import { OverlayProvider } from "@/components/providers/overlay-provider";
import { HelpChat } from "@/components/help/help-chat";

export function AppChrome({ children }: { children: ReactNode }) {
  return (
    <OverlayProvider>
      {children}
      <HelpChat />
    </OverlayProvider>
  );
}
