"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CRYPTO_ALERT_RESCAN_MS } from "@/config/crypto-alerts";
import {
  clearNotificationDedup,
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
} from "@/lib/signal-notifications";
import { useAppSettingsStore } from "@/stores/app-settings-store";

const RESCAN_OPTIONS = [
  { label: "3 min", ms: CRYPTO_ALERT_RESCAN_MS },
  { label: "1 min", ms: 60_000 },
  { label: "90s", ms: 90_000 },
  { label: "Off", ms: 0 },
] as const;

type NotificationSettingsVariant = "futures" | "intraday" | "all";

export function NotificationSettingsCard({
  description,
  variant = "all",
}: {
  description?: string;
  variant?: NotificationSettingsVariant;
}) {
  const notifications = useAppSettingsStore((s) => s.notifications);
  const notifyWhenTabVisible = useAppSettingsStore((s) => s.notifyWhenTabVisible);
  const futuresAlerts = useAppSettingsStore((s) => s.futuresAlerts);
  const intradayAlerts = useAppSettingsStore((s) => s.intradayAlerts);
  const futuresAlertIntervalMs = useAppSettingsStore((s) => s.futuresAlertIntervalMs);
  const intradayAlertIntervalMs = useAppSettingsStore((s) => s.intradayAlertIntervalMs);
  const setNotifications = useAppSettingsStore((s) => s.setNotifications);
  const setNotifyWhenTabVisible = useAppSettingsStore((s) => s.setNotifyWhenTabVisible);
  const setFuturesAlerts = useAppSettingsStore((s) => s.setFuturesAlerts);
  const setIntradayAlerts = useAppSettingsStore((s) => s.setIntradayAlerts);
  const setFuturesAlertIntervalMs = useAppSettingsStore((s) => s.setFuturesAlertIntervalMs);
  const setIntradayAlertIntervalMs = useAppSettingsStore((s) => s.setIntradayAlertIntervalMs);

  const [mounted, setMounted] = useState(false);
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "default"
  );

  const showFutures = variant === "futures" || variant === "all";
  const showIntraday = variant === "intraday" || variant === "all";

  const defaultDescription =
    variant === "futures"
      ? "Futures tab: alerts when price is in the entry zone (LONG/SHORT in zone) — not while waiting on price. Keep this tab open or install as PWA; rescans every 3 min when enabled."
      : variant === "intraday"
        ? "Intraday: alerts when price is in the entry zone with 5m confirmation — same as Enter now rows. Rescans every 3 min when enabled."
        : "Configure Futures and Intraday alerts separately. Alerts fire only when price is in the entry zone.";

  useEffect(() => {
    setMounted(true);
    setSupported(isNotificationSupported());
    const perm = getNotificationPermission();
    setPermission(perm);
    if (perm === "granted") {
      setNotifications(true);
    }
  }, [setNotifications]);

  const enable = useCallback(async () => {
    const perm = await requestNotificationPermission();
    setPermission(perm);
    setNotifications(perm === "granted");
  }, [setNotifications]);

  const statusLabel = !mounted
    ? "Checking…"
    : !supported
      ? "Not supported"
      : permission === "granted"
        ? "Enabled"
        : permission === "denied"
          ? "Blocked — allow in browser site settings"
          : "Not enabled";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Trade alerts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">{description ?? defaultDescription}</p>

        <p className="text-xs">
          Status:{" "}
          <span className="font-medium text-foreground">{statusLabel}</span>
        </p>

        {!mounted ? null : !supported ? (
          <p className="text-muted-foreground">
            Browser notifications are not supported in this environment.
          </p>
        ) : permission !== "granted" ? (
          <Button variant="default" onClick={enable}>
            Enable notifications
          </Button>
        ) : (
          <div className="space-y-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={notifications}
                onChange={(e) => setNotifications(e.target.checked)}
                className="rounded border-border"
              />
              <span>Master alerts on</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={notifyWhenTabVisible}
                onChange={(e) => setNotifyWhenTabVisible(e.target.checked)}
                className="rounded border-border"
              />
              <span>Also notify while this tab is open</span>
            </label>

            {showFutures && (
              <div className="space-y-2 rounded-md border border-border/60 p-3">
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={futuresAlerts}
                    disabled={!notifications}
                    onChange={(e) => setFuturesAlerts(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span>Futures tab alerts</span>
                </label>
                <div className="space-y-1 pl-6">
                  <span className="text-xs text-muted-foreground">Futures rescan interval</span>
                  <div className="flex flex-wrap gap-2">
                    {RESCAN_OPTIONS.map(({ label, ms }) => (
                      <Button
                        key={`futures-${label}`}
                        type="button"
                        size="sm"
                        variant={futuresAlertIntervalMs === ms ? "default" : "outline"}
                        disabled={!notifications || !futuresAlerts}
                        onClick={() => setFuturesAlertIntervalMs(ms)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {showIntraday && (
              <div className="space-y-2 rounded-md border border-border/60 p-3">
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={intradayAlerts}
                    disabled={!notifications}
                    onChange={(e) => setIntradayAlerts(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span>Intraday tab alerts</span>
                </label>
                <div className="space-y-1 pl-6">
                  <span className="text-xs text-muted-foreground">Intraday rescan interval</span>
                  <div className="flex flex-wrap gap-2">
                    {RESCAN_OPTIONS.map(({ label, ms }) => (
                      <Button
                        key={`intraday-${label}`}
                        type="button"
                        size="sm"
                        variant={intradayAlertIntervalMs === ms ? "default" : "outline"}
                        disabled={!notifications || !intradayAlerts}
                        onClick={() => setIntradayAlertIntervalMs(ms)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => clearNotificationDedup()}
            >
              Reset alert cooldowns
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
