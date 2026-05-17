import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WatchlistItem } from "@/types";

interface WatchlistState {
  items: WatchlistItem[];
  add: (symbol: string, coinId: string) => void;
  remove: (symbol: string) => void;
  has: (symbol: string) => boolean;
  setPriceAlert: (symbol: string, above?: number, below?: number) => void;
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      items: [
        { symbol: "BTC", coinId: "bitcoin", addedAt: 0 },
        { symbol: "ETH", coinId: "ethereum", addedAt: 0 },
      ],
      add: (symbol, coinId) => {
        if (get().has(symbol)) return;
        set((s) => ({
          items: [...s.items, { symbol, coinId, addedAt: Date.now() }],
        }));
      },
      remove: (symbol) =>
        set((s) => ({ items: s.items.filter((i) => i.symbol !== symbol) })),
      has: (symbol) => get().items.some((i) => i.symbol === symbol),
      setPriceAlert: (symbol, above, below) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.symbol === symbol ? { ...i, priceAlert: { above, below } } : i
          ),
        })),
    }),
    { name: "crypto-terminal-watchlist", skipHydration: true }
  )
);
