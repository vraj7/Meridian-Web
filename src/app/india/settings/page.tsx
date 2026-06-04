"use client";

import Link from "next/link";
import {
  MarketSettingsFields,
  RefreshSettingsCard,
} from "@/components/settings/market-settings-fields";
import { NotificationSettingsCard } from "@/components/settings/notification-settings-card";
import { useIndiaSettingsStore } from "@/stores/india-settings-store";

export default function IndiaSettingsPage() {
  const settings = useIndiaSettingsStore();

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

      <NotificationSettingsCard description="Intraday crypto futures alerts are configured here; India equity alerts use the same browser permission." />
    </section>
  );
}
