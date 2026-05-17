import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { IndiaSettings, Timeframe } from "@/types";

interface IndiaSettingsState extends IndiaSettings {
  setMinConfidence: (v: number) => void;
  setDemoMode: (v: boolean) => void;
  setDefaultTimeframe: (v: Timeframe) => void;
  setRefreshInterval: (v: number) => void;
}

export const useIndiaSettingsStore = create<IndiaSettingsState>()(
  persist(
    (set) => ({
      minConfidence: 55,
      demoMode: false,
      defaultTimeframe: "1h",
      refreshInterval: 60_000,
      setMinConfidence: (minConfidence) => set({ minConfidence }),
      setDemoMode: (demoMode) => set({ demoMode }),
      setDefaultTimeframe: (defaultTimeframe) => set({ defaultTimeframe }),
      setRefreshInterval: (refreshInterval) => set({ refreshInterval }),
    }),
    { name: "meridian-india-settings", skipHydration: true }
  )
);
