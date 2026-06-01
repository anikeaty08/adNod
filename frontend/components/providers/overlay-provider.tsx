"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { LoaderCircle, WalletCards } from "lucide-react";

type OverlayMode = null | "loading" | "money";

type OverlayApi = {
  withLoading: <T>(fn: () => Promise<T>) => Promise<T>;
  withMoney: <T>(fn: () => Promise<T>) => Promise<T>;
  showLoading: () => void;
  showMoney: () => void;
  hide: () => void;
};

const OverlayContext = createContext<OverlayApi | null>(null);

export function useOverlay() {
  const ctx = useContext(OverlayContext);
  if (!ctx) throw new Error("useOverlay requires OverlayProvider");
  return ctx;
}

/** Optional: no-op when outside provider (e.g. tests). */
export function useOptionalOverlay(): OverlayApi | null {
  return useContext(OverlayContext);
}

export function OverlayProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<OverlayMode>(null);

  const hide = useCallback(() => setMode(null), []);
  const showLoading = useCallback(() => setMode("loading"), []);
  const showMoney = useCallback(() => setMode("money"), []);

  const withLoading = useCallback(
    async <T,>(fn: () => Promise<T>) => {
      setMode("loading");
      try {
        return await fn();
      } finally {
        setMode(null);
      }
    },
    [],
  );

  const withMoney = useCallback(
    async <T,>(fn: () => Promise<T>) => {
      setMode("money");
      try {
        return await fn();
      } finally {
        setMode(null);
      }
    },
    [],
  );

  const api = useMemo(
    () => ({ withLoading, withMoney, showLoading, showMoney, hide }),
    [withLoading, withMoney, showLoading, showMoney, hide],
  );

  return (
    <OverlayContext.Provider value={api}>
      {children}
      {mode ? (
        <div
          className="fixed inset-0 z-[10000] flex flex-col items-center justify-center gap-4 bg-[color-mix(in_oklch,var(--bg)_86%,var(--text)_14%)] p-6"
          style={{ pointerEvents: "auto" }}
          role="alert"
          aria-busy="true"
          aria-live="polite"
        >
          <div className="grid h-20 w-20 place-items-center rounded-lg border border-border bg-[var(--surface-solid)] shadow-[var(--shadow-card)]">
            {mode === "money" ? (
              <WalletCards className="text-accent" size={30} strokeWidth={1.8} />
            ) : (
              <LoaderCircle className="animate-spin text-accent" size={30} strokeWidth={1.8} />
            )}
          </div>
          <p className="max-w-xs text-center text-sm font-medium text-[var(--text)]">
            {mode === "money" ? "Confirm the wallet transaction to continue." : "Working..."}
          </p>
        </div>
      ) : null}
    </OverlayContext.Provider>
  );
}
