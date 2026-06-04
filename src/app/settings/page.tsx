"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MarketSettingsFields,
  RefreshSettingsCard,
} from "@/components/settings/market-settings-fields";
import { NotificationSettingsCard } from "@/components/settings/notification-settings-card";
import { useCryptoSettingsStore } from "@/stores/crypto-settings-store";
import { usePortfolioStore } from "@/stores/portfolio-store";
import { useActiveSignalsStore } from "@/stores/active-signals-store";
import { useSignalHistoryStore } from "@/stores/signal-history-store";

export default function CryptoSettingsPage() {
  const settings = useCryptoSettingsStore();
  const resetPortfolio = usePortfolioStore((s) => s.reset);
  const clearHistory = useSignalHistoryStore((s) => s.clear);
  const clearActiveSignals = useActiveSignalsStore((s) => s.clear);

  return (
    <section className="space-y-6 max-w-xl">
      <header>
        <h1 className="text-2xl font-bold">Crypto settings</h1>
        <p className="text-sm text-muted-foreground">
          Spot, futures, and crypto scan preferences
        </p>
        <Link
          href="/india/settings"
          className="text-sm text-primary hover:underline mt-2 inline-block"
        >
          Indian stocks settings →
        </Link>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Quote pair</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Choose how pairs are labeled and which exchange symbol is used for charts
            (BTC/USD vs BTC/USDT). USDT has more Binance liquidity; USD matches Delta-style
            perp labels.
          </p>
          <div className="flex gap-2">
            {(["USD", "USDT"] as const).map((q) => (
              <Button
                key={q}
                type="button"
                variant={settings.quotePair === q ? "default" : "outline"}
                size="sm"
                onClick={() => settings.setQuotePair(q)}
              >
                {q}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <MarketSettingsFields
        market="crypto"
        minConfidence={settings.minConfidence}
        defaultTimeframe={settings.defaultTimeframe}
        demoMode={settings.demoMode}
        relaxedCryptoSignals={settings.relaxedCryptoSignals}
        signalLockMinutes={settings.signalLockMinutes}
        onMinConfidence={settings.setMinConfidence}
        onDefaultTimeframe={settings.setDefaultTimeframe}
        onDemoMode={settings.setDemoMode}
        onRelaxedCryptoSignals={settings.setRelaxedCryptoSignals}
        onSignalLockMinutes={settings.setSignalLockMinutes}
      />

      <RefreshSettingsCard
        refreshInterval={settings.refreshInterval}
        onRefreshInterval={settings.setRefreshInterval}
      />

      <NotificationSettingsCard />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Crypto data</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={resetPortfolio}>
            Reset paper portfolio
          </Button>
          <Button variant="outline" onClick={clearHistory}>
            Clear signal history
          </Button>
          <Button variant="outline" onClick={clearActiveSignals}>
            Reset signal locks
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
