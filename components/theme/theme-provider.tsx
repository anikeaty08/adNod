"use client";

import { ReactNode, useLayoutEffect } from "react";
import { useThemeStore, type ThemeId } from "@/lib/theme-store";

function applyTheme(theme: ThemeId) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useThemeStore((s) => s.theme);

  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return <>{children}</>;
}
