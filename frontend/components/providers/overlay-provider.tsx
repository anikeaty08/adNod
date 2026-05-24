"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

const LOTTIE_LOADING = "https://lottie.host/99aa0bbb-4c27-426c-80ad-8d5c66fca415/X5mKZW8uxe.lottie";
const LOTTIE_MONEY = "https://lottie.host/8ff13709-2b4f-4c10-8d4c-204c4a3edf8a/MBTZvaTfFM.lottie";

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
          className="fixed inset-0 z-[10000] flex flex-col items-center justify-center gap-4 bg-black/80 backdrop-blur-md"
          style={{ pointerEvents: "auto" }}
          role="alert"
          aria-busy="true"
          aria-live="polite"
        >
          <div className="h-52 w-52 md:h-64 md:w-64">
            <DotLottieReact src={mode === "money" ? LOTTIE_MONEY : LOTTIE_LOADING} loop autoplay />
          </div>
          <p className="max-w-xs text-center text-sm text-white/85">
            {mode === "money" ? "Confirming payment on-chain…" : "Loading — hang tight…"}
          </p>
        </div>
      ) : null}
    </OverlayContext.Provider>
  );
}
