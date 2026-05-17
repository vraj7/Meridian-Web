"use client";

import { useQuery } from "@tanstack/react-query";
import { formatIndiaPairLabel } from "@/config/market";
import { filterSignals } from "@/engines/risk-engine";
import { generateSignal, rankSignals } from "@/engines/signal-engine";
import { fetchIndiaCandles } from "@/services/india/india-candles";
import { useIndiaSettingsStore } from "@/stores/india-settings-store";
import type { Timeframe, TradingSignal } from "@/types";
import type { IndianStock, IndiaMarketType } from "@/types/india";

export function useIndiaBatchSignals(
  stocks: IndianStock[] | undefined,
  market: IndiaMarketType,
  timeframe: Timeframe,
  limit = 12
) {
  const demoMode = useIndiaSettingsStore((s) => s.demoMode);
  const minConfidence = useIndiaSettingsStore((s) => s.minConfidence);

  return useQuery({
    queryKey: [
      "india-batch",
      market,
      timeframe,
      limit,
      demoMode,
      stocks?.map((s) => s.symbol).join(","),
    ],
    queryFn: async () => {
      if (!stocks?.length) return [];
      const equity = stocks.filter((s) => s.segment === "equity").slice(0, limit);
      const signals: TradingSignal[] = [];

      await Promise.all(
        equity.map(async (stock) => {
          try {
            const candles = await fetchIndiaCandles(stock.symbol, timeframe, demoMode);
            const signal = generateSignal({
              symbol: stock.symbol,
              coinId: stock.id,
              candles,
              timeframe,
              market: market === "india_futures" ? "india_futures" : "india_equity",
              tradeType: market === "india_futures" ? "india_futures_long" : "india_cash",
              minConfidence,
            });
            if (signal) {
              signal.pairLabel = formatIndiaPairLabel(stock.symbol);
              signal.currency = "INR";
              signals.push(signal);
            }
          } catch {
            /* skip */
          }
        })
      );

      return rankSignals(filterSignals(signals, minConfidence));
    },
    enabled: !!stocks?.length,
    staleTime: 90_000,
    refetchInterval: 120_000,
  });
}
