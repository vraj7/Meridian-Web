import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { TradingSignal } from "@/types";

interface SignalHistoryState {
  history: TradingSignal[];
  add: (signal: TradingSignal) => void;
  clear: () => void;
}

export const useSignalHistoryStore = create<SignalHistoryState>()(
  persist(
    (set) => ({
      history: [],
      add: (signal) =>
        set((s) => ({
          history: [signal, ...s.history].slice(0, 200),
        })),
      clear: () => set({ history: [] }),
    }),
    { name: "crypto-terminal-signals", skipHydration: true }
  )
);
