import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeId = "nebula" | "solar" | "arctic" | "mono";

type ThemeState = {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "nebula",
      setTheme: (theme) => set({ theme }),
    }),
    { name: "adnode-theme" },
  ),
);

export const THEME_LABELS: Record<ThemeId, string> = {
  nebula: "Nebula",
  solar: "Solar",
  arctic: "Arctic",
  mono: "Mono",
};
