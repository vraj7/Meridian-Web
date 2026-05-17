"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MarketSettingsFields,
  RefreshSettingsCard,
} from "@/components/settings/market-settings-fields";
import { useAppSettingsStore } from "@/stores/app-settings-store";
import { useIndiaSettingsStore } from "@/stores/india-settings-store";

export default function IndiaSettingsPage() {
  const settings = useIndiaSettingsStore();
  const setNotifications = useAppSettingsStore((s) => s.setNotifications);

  const requestNotifications = async () => {
    if ("Notification" in window) {
      const perm = await Notification.requestPermission();
      setNotifications(perm === "granted");
    }
  };

  return (
    <section className="space-y-6 max-w-xl">
      <header>
        <h1 className="text-2xl font-bold">Indian stocks settings</h1>
        <p className="text-sm text-muted-foreground">
          NSE terminal, signals, options, and equity scan preferences
        </p>
        <Link href="/settings" className="text-sm text-primary hover:underline mt-2 inline-block">
          Crypto settings →
        </Link>
      </header>

      <MarketSettingsFields
        market="india"
        minConfidence={settings.minConfidence}
        defaultTimeframe={settings.defaultTimeframe}
        demoMode={settings.demoMode}
        onMinConfidence={settings.setMinConfidence}
        onDefaultTimeframe={settings.setDefaultTimeframe}
        onDemoMode={settings.setDemoMode}
      />

      <RefreshSettingsCard
        refreshInterval={settings.refreshInterval}
        onRefreshInterval={settings.setRefreshInterval}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={requestNotifications}>
            Enable browser notifications
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
