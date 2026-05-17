"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CRYPTO_SCAN_BATCH_SIZE } from "@/config/crypto-scan";
import { scanAllCryptoBatches, getFullScanOffsets } from "@/lib/crypto-scan-client";
import { getMarketScanPage, nextScanOffset } from "@/lib/crypto-scan-slice";
import { useBatchAnalysis } from "@/hooks/use-batch-analysis";
import { useActiveSignalsStore } from "@/stores/active-signals-store";
import { useCryptoSettingsStore } from "@/stores/crypto-settings-store";
import type { BatchAnalysisResult } from "@/lib/crypto-scan-client";
import type { CoinMarket, Timeframe } from "@/types";

export function usePaginatedCryptoScan(
  markets: CoinMarket[] | undefined,
  market: "spot" | "futures",
  timeframe: Timeframe,
  pageSize = CRYPTO_SCAN_BATCH_SIZE
) {
  const [offset, setOffset] = useState(0);
  const [fullScan, setFullScan] = useState<BatchAnalysisResult | null>(null);
  const [isScanningAll, setIsScanningAll] = useState(false);
  const [scanAllProgress, setScanAllProgress] = useState<{ current: number; total: number } | null>(
    null
  );
  const abortRef = useRef(false);

  const demoMode = useCryptoSettingsStore((s) => s.demoMode);
  const minConfidence = useCryptoSettingsStore((s) => s.minConfidence);
  const relaxed = useCryptoSettingsStore((s) => s.relaxedCryptoSignals);
  const quotePair = useCryptoSettingsStore((s) => s.quotePair);
  const signalLockMinutes = useCryptoSettingsStore((s) => s.signalLockMinutes ?? 15);
  const stabilizeBatch = useActiveSignalsStore((s) => s.stabilizeBatch);
  const lockMs = signalLockMinutes * 60_000;

  const resetKey = `${market}-${timeframe}-${pageSize}-${markets?.map((m) => m.symbol).join(",")}-${demoMode}-${minConfidence}-${relaxed}-${quotePair}`;

  useEffect(() => {
    setOffset(0);
    setFullScan(null);
    setScanAllProgress(null);
    setIsScanningAll(false);
    abortRef.current = false;
  }, [resetKey]);

  const pageMarkets = useMemo(
    () => (markets?.length ? getMarketScanPage(markets, offset, pageSize) : undefined),
    [markets, offset, pageSize]
  );

  const query = useBatchAnalysis(pageMarkets, market, timeframe, pageSize);

  const totalBatches = markets?.length ? Math.ceil(markets.length / pageSize) : 0;
  const isFullScanActive = fullScan !== null;

  const loadMoreCoins = useCallback(() => {
    if (!markets?.length) return;
    setFullScan(null);
    setOffset((o) => nextScanOffset(o, pageSize, markets.length));
  }, [markets, pageSize]);

  const scanAllBatches = useCallback(async () => {
    if (!markets?.length || isScanningAll) return;

    abortRef.current = false;
    setIsScanningAll(true);
    setFullScan(null);
    const total = getFullScanOffsets(markets.length, pageSize).length;
    setScanAllProgress({ current: 0, total });

    try {
      const result = await scanAllCryptoBatches({
        markets,
        market,
        timeframe,
        pageSize,
        minConfidence,
        relaxed,
        demoMode,
        quotePair,
        lockMs,
        stabilize: stabilizeBatch,
        onProgress: (current, totalPages) => {
          if (!abortRef.current) {
            setScanAllProgress({ current, total: totalPages });
          }
        },
      });

      if (!abortRef.current) {
        setFullScan(result);
        setOffset(0);
      }
    } finally {
      if (!abortRef.current) {
        setIsScanningAll(false);
        setScanAllProgress(null);
      }
    }
  }, [
    markets,
    isScanningAll,
    market,
    timeframe,
    pageSize,
    minConfidence,
    relaxed,
    demoMode,
    quotePair,
    lockMs,
    stabilizeBatch,
  ]);

  const pageInfo = useMemo(() => {
    if (!markets?.length) return null;

    if (isFullScanActive) {
      return {
        offset: 0,
        pageIndex: totalBatches,
        totalPages: totalBatches,
        symbols: markets.map((m) => m.symbol),
        totalCoins: markets.length,
        fullScan: true as const,
      };
    }

    if (!pageMarkets?.length) return null;
    const totalPages = Math.max(1, totalBatches);
    const pageIndex = Math.floor(offset / pageSize) % totalPages;
    return {
      offset,
      pageIndex: pageIndex + 1,
      totalPages,
      symbols: pageMarkets.map((m) => m.symbol),
      totalCoins: markets.length,
      fullScan: false as const,
    };
  }, [markets, pageMarkets, offset, pageSize, totalBatches, isFullScanActive]);

  const displayMarkets = isFullScanActive ? markets ?? [] : pageMarkets ?? [];
  const signals = isFullScanActive ? fullScan.signals : query.data?.signals;
  const grades = isFullScanActive ? fullScan.grades : query.data?.grades;

  return {
    ...query,
    signals,
    grades,
    pageMarkets: displayMarkets,
    loadMoreCoins,
    scanAllBatches,
    isScanningAll,
    scanAllProgress,
    isFullScanActive,
    pageInfo,
    resetPage: () => {
      setOffset(0);
      setFullScan(null);
    },
    isLoading: isScanningAll || query.isLoading,
    isFetching: isScanningAll || query.isFetching,
  };
}
