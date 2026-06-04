"use client";

import { useEffect, useRef } from "react";
import { notifyIntradaySignals } from "@/lib/signal-notifications";
import { useAppSettingsStore } from "@/stores/app-settings-store";
import type { FuturesIntradaySignal } from "@/types/futures-intraday";

/** Intraday tab only — alert when a setup is enter-now (in zone + 5m confirm). */
export function useIntradaySignalNotifications(
  signals: FuturesIntradaySignal[],
  scanCompletedAt: number | null
) {
  const notificationsEnabled = useAppSettingsStore((s) => s.notifications);
  const intradayAlerts = useAppSettingsStore((s) => s.intradayAlerts);
  const notifyWhenTabVisible = useAppSettingsStore((s) => s.notifyWhenTabVisible);
  const lastNotifiedScan = useRef<number | null>(null);

  const enterNow = signals.filter((s) => s.readyToEnter);

  useEffect(() => {
    if (!notificationsEnabled || !intradayAlerts || !scanCompletedAt) return;
    if (lastNotifiedScan.current === scanCompletedAt) return;
    lastNotifiedScan.current = scanCompletedAt;
    if (!enterNow.length) return;

    notifyIntradaySignals(enterNow, { notifyWhenTabVisible });
  }, [enterNow, scanCompletedAt, notificationsEnabled, intradayAlerts, notifyWhenTabVisible]);
}
