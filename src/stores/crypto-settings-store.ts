import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CryptoQuotePair } from "@/config/market";
import type { CryptoSettings, Timeframe } from "@/types";

interface CryptoSettingsState extends CryptoSettings {
  setMinConfidence: (v: number) => void;
  setQuotePair: (v: CryptoQuotePair) => void;
  setRelaxedCryptoSignals: (v: boolean) => void;
  setDemoMode: (v: boolean) => void;
  setDefaultTimeframe: (v: Timeframe) => void;
  setRefreshInterval: (v: number) => void;
  setSignalLockMinutes: (v: number) => void;
}

export const useCryptoSettingsStore = create<CryptoSettingsState>()(
  persist(
    (set) => ({
      minConfidence: 55,
      quotePair: "USD",
      relaxedCryptoSignals: false,
      demoMode: false,
      defaultTimeframe: "1h",
      refreshInterval: 60_000,
      signalLockMinutes: 15,
      setMinConfidence: (minConfidence) => set({ minConfidence }),
      setQuotePair: (quotePair) => set({ quotePair }),
      setRelaxedCryptoSignals: (relaxedCryptoSignals) => set({ relaxedCryptoSignals }),
      setDemoMode: (demoMode) => set({ demoMode }),
      setDefaultTimeframe: (defaultTimeframe) => set({ defaultTimeframe }),
      setRefreshInterval: (refreshInterval) => set({ refreshInterval }),
      setSignalLockMinutes: (signalLockMinutes) => set({ signalLockMinutes }),
    }),
    { name: "meridian-crypto-settings", skipHydration: true }
  )
);
