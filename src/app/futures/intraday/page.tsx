"use client";

import { MarketTrendCard } from "@/components/signals/market-trend-card";
import { FuturesMtfDashboard } from "@/components/signals/futures-mtf-dashboard";
import { NotificationSettingsCard } from "@/components/settings/notification-settings-card";
import { FUTURES_INTRADAY_MIN_CONFIDENCE } from "@/config/futures-intraday";
import { useMarkets } from "@/hooks/use-markets";

export default function FuturesIntradayPage() {
  const { data: markets } = useMarkets();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Intraday Futures</h1>
        <p className="text-sm text-muted-foreground mt-1">
          15-minute execution engine · 5m entry confirmation · HTF filters · Confidence ≥
          {FUTURES_INTRADAY_MIN_CONFIDENCE}% conf · enter-now only · rescan every 3 min · alerts when
          price is in zone
        </p>
      </div>

      <NotificationSettingsCard variant="intraday" />

      <MarketTrendCard />
      <FuturesMtfDashboard markets={markets} />
    </div>
  );
}
