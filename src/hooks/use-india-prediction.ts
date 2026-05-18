"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { runIndiaPrediction } from "@/engines/india-prediction-engine";
import { fetchIndiaCandles } from "@/services/india/india-candles";
import { fetchNseOptionChain } from "@/services/india/nse-india";
import { getDemoOptionChain } from "@/data/india-demo";
import { useIndiaSettingsStore } from "@/stores/india-settings-store";
import type { Timeframe } from "@/types";
import type { IndiaMarketType } from "@/types/india";

export function useIndiaPrediction(
  symbol: string,
  stockId: string,
  timeframe: Timeframe,
  market: IndiaMarketType
) {
  const demoMode = useIndiaSettingsStore((s) => s.demoMode);
  const minConfidence = useIndiaSettingsStore((s) => s.minConfidence);

  return useQuery({
    queryKey: ["india-prediction", symbol, stockId, timeframe, market, demoMode, minConfidence],
    queryFn: async () => {
      const candles = await fetchIndiaCandles(symbol, timeframe, demoMode);
      let optionChain = null;
      if (market === "india_options" || market === "india_futures") {
        const und = ["NIFTY", "BANKNIFTY", "FINNIFTY"].includes(symbol)
          ? (symbol as "NIFTY" | "BANKNIFTY" | "FINNIFTY")
          : "NIFTY";
        if (demoMode) {
          optionChain = getDemoOptionChain(und);
        } else {
          try {
            optionChain = await fetchNseOptionChain(und);
          } catch {
            optionChain = getDemoOptionChain(und);
          }
        }
      }
      return runIndiaPrediction({
        symbol,
        stockId,
        candles,
        timeframe,
        market,
        optionChain,
        minConfidence,
      });
    },
    enabled: !!symbol,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
