import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PaperPosition {
  id: string;
  symbol: string;
  side: "long" | "short";
  entryPrice: number;
  size: number;
  leverage: number;
  openedAt: number;
}

interface PortfolioState {
  balance: number;
  positions: PaperPosition[];
  openPosition: (pos: Omit<PaperPosition, "id" | "openedAt">) => void;
  closePosition: (id: string, exitPrice: number) => number;
  reset: () => void;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      balance: 10_000,
      positions: [],
      openPosition: (pos) =>
        set((s) => ({
          positions: [
            ...s.positions,
            {
              ...pos,
              id: `${Date.now()}-${pos.symbol}`,
              openedAt: Date.now(),
            },
          ],
        })),
      closePosition: (id, exitPrice) => {
        const pos = get().positions.find((p) => p.id === id);
        if (!pos) return 0;
        const pnl =
          pos.side === "long"
            ? (exitPrice - pos.entryPrice) * pos.size
            : (pos.entryPrice - exitPrice) * pos.size;
        set((s) => ({
          balance: s.balance + pnl,
          positions: s.positions.filter((p) => p.id !== id),
        }));
        return pnl;
      },
      reset: () => set({ balance: 10_000, positions: [] }),
    }),
    { name: "crypto-terminal-portfolio", skipHydration: true }
  )
);
