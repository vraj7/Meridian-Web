"use client";

import { useQuery } from "@tanstack/react-query";
import { analyzeOptionChainFull } from "@/engines/india-options-engine";
import { buildStockPick } from "@/engines/india-stock-timing-engine";
import { getDemoOptionChain } from "@/data/india-demo";
import { fetchIndiaCandles } from "@/services/india/india-candles";
import { fetchIndiaNews } from "@/services/india/india-news";
import { getNseMarketStatus } from "@/lib/nse-market-hours";
import { fetchIndiaStocks } from "@/services/india/india-markets";
import { fetchNseOptionChain } from "@/services/india/nse-india";
import { useIndiaSettingsStore } from "@/stores/india-settings-store";
import type { Timeframe } from "@/types";
import type { IndiaOptionsPlaybook, IndiaStockPick } from "@/types/india";
import type { IndiaUnderlying } from "./use-india-options";

export function useIndiaIntelligence(timeframe?: Timeframe) {
  const demoMode = useIndiaSettingsStore((s) => s.demoMode);
  const minConfidence = useIndiaSettingsStore((s) => s.minConfidence);
  const defaultTf = useIndiaSettingsStore((s) => s.defaultTimeframe);
  const tf = timeframe ?? defaultTf;

  return useQuery({
    queryKey: ["india-intelligence", tf, demoMode, minConfidence],
    queryFn: async () => {
      const [stocks, news] = await Promise.all([
        fetchIndiaStocks(demoMode),
        fetchIndiaNews(demoMode),
      ]);

      const equities = stocks.filter((s) => s.segment === "equity");
      const stockPicks: IndiaStockPick[] = [];
      const buyStocks: IndiaStockPick[] = [];
      const sellStocks: IndiaStockPick[] = [];

      await Promise.all(
        equities.slice(0, 20).map(async (stock) => {
          try {
            const candles = await fetchIndiaCandles(stock.symbol, tf, demoMode);
            const pick = buildStockPick({ stock, candles, timeframe: tf, news, minConfidence });
            if (pick) {
              stockPicks.push(pick);
              if (pick.action === "BUY") buyStocks.push(pick);
              if (pick.action === "SELL") sellStocks.push(pick);
            }
          } catch {
            /* skip */
          }
        })
      );

      stockPicks.sort((a, b) => b.confidence - a.confidence);
      buyStocks.sort((a, b) => b.confidence - a.confidence);
      sellStocks.sort((a, b) => b.confidence - a.confidence);

      const underlyings: IndiaUnderlying[] = ["NIFTY", "BANKNIFTY", "FINNIFTY"];
      const optionsPlaybooks: IndiaOptionsPlaybook[] = [];

      for (const und of underlyings) {
        let chain;
        if (demoMode) chain = getDemoOptionChain(und);
        else {
          try {
            chain = await fetchNseOptionChain(und);
          } catch {
            chain = getDemoOptionChain(und);
          }
        }
        if (!chain) chain = getDemoOptionChain(und);
        optionsPlaybooks.push(analyzeOptionChainFull(chain, news, minConfidence));
      }

      return {
        news,
        marketStatus: getNseMarketStatus(),
        stockPicks,
        buyStocks,
        sellStocks,
        optionsPlaybooks,
      };
    },
    staleTime: 90_000,
    refetchInterval: 120_000,
  });
}
