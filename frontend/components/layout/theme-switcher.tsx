"use client";

import { Moon, Palette, Snowflake, Sun } from "lucide-react";
import { useThemeStore, type ThemeId, THEME_LABELS } from "@/lib/theme-store";
import styles from "./theme-switcher.module.css";

const ICONS: Record<ThemeId, typeof Moon> = {
  nebula: Palette,
  solar: Sun,
  arctic: Snowflake,
  mono: Moon,
};

const ORDER: ThemeId[] = ["nebula", "solar", "arctic", "mono"];

export function ThemeSwitcher() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className={styles.wrap} title="Theme">
      {ORDER.map((id) => {
        const Icon = ICONS[id];
        const active = theme === id;
        return (
          <button
            key={id}
            type="button"
            className={`${styles.btn} ${active ? styles.active : ""}`.trim()}
            onClick={() => setTheme(id)}
            aria-label={THEME_LABELS[id]}
            aria-pressed={active}
          >
            <Icon size={16} strokeWidth={2} />
          </button>
        );
      })}
    </div>
  );
}
