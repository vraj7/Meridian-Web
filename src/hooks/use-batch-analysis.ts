"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  fetchCryptoBatchScan,
  postProcessBatchSignals,
  type BatchAnalysisResult,
} from "@/lib/crypto-scan-client";
import { useActiveSignalsStore } from "@/stores/active-signals-store";
import { useCryptoSettingsStore } from "@/stores/crypto-settings-store";
import type { CoinMarket, Timeframe } from "@/types";

export type { BatchAnalysisResult };

export function useBatchAnalysis(
  markets: CoinMarket[] | undefined,
  market: "spot" | "futures",
  timeframe: Timeframe,
  limit = 10
) {
  const demoMode = useCryptoSettingsStore((s) => s.demoMode);
  const minConfidence = useCryptoSettingsStore((s) => s.minConfidence);
  const relaxedCryptoSignals = useCryptoSettingsStore((s) => s.relaxedCryptoSignals);
  const quotePair = useCryptoSettingsStore((s) => s.quotePair);
  const signalLockMinutes = useCryptoSettingsStore((s) => s.signalLockMinutes ?? 15);
  const stabilizeBatch = useActiveSignalsStore((s) => s.stabilizeBatch);
  const lockMs = signalLockMinutes * 60_000;

  return useQuery({
    queryKey: [
      "batch-analysis",
      market,
      timeframe,
      limit,
      demoMode,
      minConfidence,
      relaxedCryptoSignals,
      quotePair,
      signalLockMinutes,
      markets?.map((m) => m.symbol).join(","),
    ],
    queryFn: async (): Promise<BatchAnalysisResult> => {
      if (!markets?.length) return { signals: [], grades: {} };

      const raw = await fetchCryptoBatchScan({
        markets,
        market,
        timeframe,
        limit,
        minConfidence,
        relaxed: relaxedCryptoSignals,
        demoMode,
        quotePair,
      });

      return postProcessBatchSignals(
        raw,
        minConfidence,
        relaxedCryptoSignals,
        stabilizeBatch,
        lockMs
      );
    },
    enabled: !!markets?.length,
    staleTime: 120_000,
    gcTime: 300_000,
    refetchInterval: 180_000,
    placeholderData: keepPreviousData,
  });
}

export function useBatchSignals(
  markets: CoinMarket[] | undefined,
  market: "spot" | "futures",
  timeframe: Timeframe,
  limit = 10
) {
  const query = useBatchAnalysis(markets, market, timeframe, limit);
  return { ...query, data: query.data?.signals };
}

export function useBatchCoinGrades(
  markets: CoinMarket[] | undefined,
  market: "spot" | "futures",
  timeframe: Timeframe,
  limit = 10
) {
  const query = useBatchAnalysis(markets, market, timeframe, limit);
  return { ...query, data: query.data?.grades };
}
