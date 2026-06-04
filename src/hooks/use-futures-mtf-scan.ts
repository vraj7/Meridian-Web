"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { scanAllFuturesMtfBatches } from "@/lib/futures-mtf-scan-client";
import { useAppSettingsStore } from "@/stores/app-settings-store";
import { useCryptoSettingsStore } from "@/stores/crypto-settings-store";
import type { CoinMarket } from "@/types";
import type { FuturesMtfScanResult } from "@/types/futures-intraday";

export function useFuturesMtfFullScan(markets: CoinMarket[] | undefined) {
  const demoMode = useCryptoSettingsStore((s) => s.demoMode);
  const quotePair = useCryptoSettingsStore((s) => s.quotePair);
  const notificationsEnabled = useAppSettingsStore((s) => s.notifications);
  const intradayAlerts = useAppSettingsStore((s) => s.intradayAlerts);
  const alertIntervalMs = useAppSettingsStore((s) => s.intradayAlertIntervalMs);

  const [data, setData] = useState<FuturesMtfScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [lastScanAt, setLastScanAt] = useState<number | null>(null);
  const abortRef = useRef(false);
  const scanGenRef = useRef(0);

  const runScan = useCallback(
    async (opts?: { userInitiated?: boolean }) => {
      if (!markets?.length) return;

      const gen = ++scanGenRef.current;
      abortRef.current = false;
      setIsScanning(true);
      setError(null);
      if (opts?.userInitiated) setData(null);
      setProgress({ current: 0, total: Math.ceil(markets.length / 25) });

      try {
        const result = await scanAllFuturesMtfBatches({
          markets,
          demoMode,
          quotePair,
          onProgress: (current, total) => {
            if (gen === scanGenRef.current) {
              setProgress({ current, total });
            }
          },
        });

        if (gen !== scanGenRef.current || abortRef.current) return;

        setData(result);
        setLastScanAt(Date.now());
      } catch (err) {
        if (gen !== scanGenRef.current) return;
        setError(err instanceof Error ? err.message : "Scan failed");
      } finally {
        if (gen === scanGenRef.current) {
          setIsScanning(false);
          setProgress(null);
        }
      }
    },
    [markets, demoMode, quotePair]
  );

  const marketsKey = markets?.map((m) => m.symbol).join(",") ?? "";
  const settingsKey = `${demoMode}-${quotePair}`;

  useEffect(() => {
    abortRef.current = false;
    if (!markets?.length) {
      setData(null);
      return;
    }
    void runScan();
    return () => {
      abortRef.current = true;
      scanGenRef.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scan keyed by symbol list, not markets ref
  }, [marketsKey, settingsKey]);

  const rescan = useCallback(() => {
    runScan({ userInitiated: true });
  }, [runScan]);

  const refreshKey = notificationsEnabled && intradayAlerts ? alertIntervalMs : 0;

  useEffect(() => {
    if (!refreshKey || !markets?.length) return;
    const id = window.setInterval(() => {
      void runScan();
    }, refreshKey);
    return () => window.clearInterval(id);
  }, [refreshKey, marketsKey, settingsKey, runScan]);

  return {
    data,
    signals: data?.signals ?? [],
    assessments: data?.assessments ?? [],
    scanned: data?.scanned ?? 0,
    isScanning,
    error,
    progress,
    lastScanAt,
    rescan,
  };
}
