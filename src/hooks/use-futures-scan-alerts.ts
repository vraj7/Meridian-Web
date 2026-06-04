"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CRYPTO_SCAN_BATCH_SIZE } from "@/config/crypto-scan";
import { usePaginatedCryptoScan } from "@/hooks/use-paginated-crypto-scan";
import { useFuturesSignalNotifications } from "@/hooks/use-futures-signal-notifications";
import { useAppSettingsStore } from "@/stores/app-settings-store";
import { useCryptoSettingsStore } from "@/stores/crypto-settings-store";
import type { CoinMarket } from "@/types";

/**
 * Futures tab scan + optional full-universe rescans and browser alerts.
 */
export function useFuturesScanWithAlerts(markets: CoinMarket[] | undefined) {
  const tf = useCryptoSettingsStore((s) => s.defaultTimeframe);
  const master = useAppSettingsStore((s) => s.notifications);
  const futuresAlerts = useAppSettingsStore((s) => s.futuresAlerts);
  const intervalMs = useAppSettingsStore((s) => s.futuresAlertIntervalMs);

  const scan = usePaginatedCryptoScan(markets, "futures", tf, CRYPTO_SCAN_BATCH_SIZE);
  const { scanAllBatches, isScanningAll, signals } = scan;
  const [lastScanAt, setLastScanAt] = useState<number | null>(null);
  const scanGenRef = useRef(0);

  const alertsOn = master && futuresAlerts;

  const runFullScan = useCallback(async () => {
    if (!markets?.length || isScanningAll) return;
    const gen = ++scanGenRef.current;
    await scanAllBatches();
    if (gen === scanGenRef.current) {
      setLastScanAt(Date.now());
    }
  }, [markets?.length, isScanningAll, scanAllBatches]);

  const marketsKey = markets?.map((m) => m.symbol).join(",") ?? "";
  const settingsKey = `${tf}-${master}-${futuresAlerts}-${intervalMs}`;

  useEffect(() => {
    if (!alertsOn || !markets?.length) return;
    void runFullScan();
    return () => {
      scanGenRef.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketsKey, settingsKey]);

  useEffect(() => {
    if (!alertsOn || !intervalMs || !markets?.length) return;
    const id = window.setInterval(() => void runFullScan(), intervalMs);
    return () => window.clearInterval(id);
  }, [alertsOn, intervalMs, marketsKey, runFullScan]);

  useFuturesSignalNotifications(signals, lastScanAt);

  return {
    ...scan,
    lastScanAt,
    alertsOn,
    runFullScanForAlerts: runFullScan,
  };
}
