"use client";

import { useQuery } from "@tanstack/react-query";
import { computeIndicators, higherTimeframeBias } from "@/engines/indicators";
import { HIGHER_TIMEFRAME, resolveMarketTrend } from "@/engines/crypto-timing-engine";
import { CANDLE_LIMIT_HTF, CANDLE_LIMIT_PRIMARY } from "@/config/api";
import { fetchCandles } from "@/services/candles";
import { useCryptoSettingsStore } from "@/stores/crypto-settings-store";
import type { MarketTrendLabel } from "@/types";

/** BTC-based read on overall crypto market direction (proxy for market mood). */
export function useCryptoMarketTrend(symbol = "BTC") {
  const demoMode = useCryptoSettingsStore((s) => s.demoMode);
  const quotePair = useCryptoSettingsStore((s) => s.quotePair);
  const timeframe = useCryptoSettingsStore((s) => s.defaultTimeframe);
  const higherTf = HIGHER_TIMEFRAME[timeframe];

  return useQuery({
    queryKey: ["crypto-market-trend", symbol, timeframe, demoMode, quotePair],
    queryFn: async () => {
      const [candles, htfCandles] = await Promise.all([
        fetchCandles(symbol, timeframe, CANDLE_LIMIT_PRIMARY, demoMode, quotePair),
        higherTf !== timeframe
          ? fetchCandles(symbol, higherTf, CANDLE_LIMIT_HTF, demoMode, quotePair).catch(() => [])
          : Promise.resolve([]),
      ]);

      const indicators = computeIndicators(candles);
      const htfBias = htfCandles.length >= 50 ? higherTimeframeBias(htfCandles) : "ranging";

      const trend = resolveMarketTrend({
        indicators,
        htfBias,
        timeframe,
        higherTf,
        candles,
      });

      return {
        symbol,
        price: candles[candles.length - 1]?.close ?? 0,
        ...trend,
        rsi: indicators.rsi,
        adx: indicators.adx,
      };
    },
    staleTime: 120_000,
    gcTime: 300_000,
    refetchInterval: 120_000,
  });
}

export function trendActionHint(trend: MarketTrendLabel): string {
  switch (trend) {
    case "Uptrend":
      return "Market bias: favor longs / buy dips · be careful shorting";
    case "Downtrend":
      return "Market bias: favor shorts / sell rallies · be careful buying";
    default:
      return "Market bias: range / unclear — smaller size, wait for breakout";
  }
}
