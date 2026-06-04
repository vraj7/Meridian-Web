"use client";

import { useEffect, useMemo, useRef } from "react";
import { notifyTradingSignals } from "@/lib/signal-notifications";
import { useAppSettingsStore } from "@/stores/app-settings-store";
import type { TradingSignal } from "@/types";

/** Futures tab (/futures) — alerts for actionable LONG/SHORT with price in entry zone. */
export function useFuturesSignalNotifications(
  signals: TradingSignal[] | undefined,
  scanCompletedAt: number | null
) {
  const master = useAppSettingsStore((s) => s.notifications);
  const futuresAlerts = useAppSettingsStore((s) => s.futuresAlerts);
  const notifyWhenTabVisible = useAppSettingsStore((s) => s.notifyWhenTabVisible);
  const lastNotifiedScan = useRef<number | null>(null);

  const actionable = useMemo(
    () => (signals ?? []).filter((s) => s.market === "futures"),
    [signals]
  );

  useEffect(() => {
    if (!master || !futuresAlerts || !scanCompletedAt) return;
    if (lastNotifiedScan.current === scanCompletedAt) return;
    lastNotifiedScan.current = scanCompletedAt;
    if (!actionable.length) return;

    notifyTradingSignals(actionable, {
      notifyWhenTabVisible,
      market: "futures",
      url: "/futures",
    });
  }, [actionable, scanCompletedAt, master, futuresAlerts, notifyWhenTabVisible]);
}
