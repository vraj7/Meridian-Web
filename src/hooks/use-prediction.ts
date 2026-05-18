"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { CANDLE_LIMIT_HTF, CANDLE_LIMIT_PRIMARY } from "@/config/api";
import { resolveCryptoSignalFilters } from "@/config/crypto-signal-filters";
import { HIGHER_TIMEFRAME } from "@/engines/crypto-timing-engine";
import { runPrediction } from "@/engines/prediction-engine";
import { fetchCandles } from "@/services/candles";
import { fetchFuturesMetrics } from "@/services/futures";
import { fetchFullSentiment } from "@/services/sentiment";
import { useActiveSignalsStore } from "@/stores/active-signals-store";
import { useCryptoSettingsStore } from "@/stores/crypto-settings-store";
import type { Timeframe } from "@/types";

export function usePrediction(
  symbol: string,
  coinId: string,
  timeframe: Timeframe,
  market: "spot" | "futures" = "spot"
) {
  const demoMode = useCryptoSettingsStore((s) => s.demoMode);
  const minConfidence = useCryptoSettingsStore((s) => s.minConfidence);
  const relaxedCryptoSignals = useCryptoSettingsStore((s) => s.relaxedCryptoSignals);
  const quotePair = useCryptoSettingsStore((s) => s.quotePair);
  const signalLockMinutes = useCryptoSettingsStore((s) => s.signalLockMinutes ?? 15);
  const filters = resolveCryptoSignalFilters(minConfidence, relaxedCryptoSignals);
  const stabilizeOne = useActiveSignalsStore((s) => s.stabilizeOne);
  const htfTimeframe = HIGHER_TIMEFRAME[timeframe];

  return useQuery({
    queryKey: [
      "prediction",
      symbol,
      coinId,
      timeframe,
      market,
      demoMode,
      minConfidence,
      relaxedCryptoSignals,
      quotePair,
    ],
    queryFn: async () => {
      const [candles, htfCandles, sentiment, futures] = await Promise.all([
        fetchCandles(symbol, timeframe, CANDLE_LIMIT_PRIMARY, demoMode, quotePair),
        htfTimeframe !== timeframe
          ? fetchCandles(symbol, htfTimeframe, CANDLE_LIMIT_HTF, demoMode, quotePair).catch(
              () => undefined
            )
          : Promise.resolve(undefined),
        fetchFullSentiment(demoMode),
        market === "futures" ? fetchFuturesMetrics(symbol, demoMode) : undefined,
      ]);
      const result = await runPrediction({
        symbol,
        coinId,
        candles,
        higherTimeframeCandles: htfCandles,
        timeframe,
        market,
        sentiment,
        futures,
        minConfidence: filters.minConfidence,
        minConfirmations: filters.minConfirmations,
        minRiskReward: filters.minRiskReward,
        relaxed: relaxedCryptoSignals,
        quotePair,
      });
      if (!result?.signal) return result;
      return {
        ...result,
        signal: stabilizeOne(result.signal, signalLockMinutes * 60_000),
      };
    },
    enabled: !!symbol && !!coinId,
    staleTime: 90_000,
    refetchInterval: 120_000,
    placeholderData: keepPreviousData,
  });
}
