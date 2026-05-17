import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_SIGNAL_LOCK_MS,
  stabilizeSignal,
  stabilizeSignalBatch,
  signalStableKey,
} from "@/lib/signal-stabilizer";
import type { TradingSignal } from "@/types";

interface ActiveSignalsState {
  byKey: Record<string, TradingSignal>;
  lockMs: number;
  setLockMs: (ms: number) => void;
  stabilizeOne: (signal: TradingSignal, lockMs?: number) => TradingSignal;
  stabilizeBatch: (signals: TradingSignal[], lockMs?: number) => TradingSignal[];
  clear: () => void;
}

export const useActiveSignalsStore = create<ActiveSignalsState>()(
  persist(
    (set, get) => ({
      byKey: {},
      lockMs: DEFAULT_SIGNAL_LOCK_MS,
      setLockMs: (lockMs) => set({ lockMs }),
      stabilizeOne: (signal, lockMsOverride) => {
        const key = signalStableKey(signal);
        const { byKey, lockMs } = get();
        const ms = lockMsOverride ?? lockMs;
        const stabilized = stabilizeSignal(byKey[key], signal, ms);
        set({ byKey: { ...byKey, [key]: stabilized } });
        return stabilized;
      },
      stabilizeBatch: (signals, lockMsOverride) => {
        const { byKey, lockMs } = get();
        const ms = lockMsOverride ?? lockMs;
        const { signals: stabilized, nextByKey } = stabilizeSignalBatch(byKey, signals, ms);
        set({ byKey: nextByKey });
        return stabilized;
      },
      clear: () => set({ byKey: {} }),
    }),
    { name: "crypto-terminal-active-signals", skipHydration: true }
  )
);
