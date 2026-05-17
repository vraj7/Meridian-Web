"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trendActionHint, useCryptoMarketTrend } from "@/hooks/use-crypto-market-trend";
import { useCryptoSettingsStore } from "@/stores/crypto-settings-store";
import { HIGHER_TIMEFRAME } from "@/engines/crypto-timing-engine";
import { TrendBanner } from "@/components/signals/trend-banner";
import { formatUsd } from "@/lib/utils";

/** Overall crypto market trend (BTC proxy) for dashboard / spot / futures pages. */
export function MarketTrendCard() {
  const tf = useCryptoSettingsStore((s) => s.defaultTimeframe);
  const { data, isLoading } = useCryptoMarketTrend("BTC");
  const higherTf = HIGHER_TIMEFRAME[tf];

  if (isLoading) return <Skeleton className="h-28" />;

  if (!data) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex flex-wrap justify-between gap-2">
          <span>Overall market trend (BTC · {tf})</span>
          <span className="font-mono font-normal text-muted-foreground">
            {formatUsd(data.price)}
          </span>
        </CardTitle>
        <p className="text-xs text-muted-foreground">{trendActionHint(data.overallTrend)}</p>
      </CardHeader>
      <CardContent>
        <TrendBanner
          chartTrend={data.chartTrend}
          higherTfTrend={data.higherTfTrend}
          overallTrend={data.overallTrend}
          trendDetail={data.trendDetail}
          timeframe={tf}
          higherTf={higherTf}
        />
        <p className="text-[10px] text-muted-foreground mt-2">
          RSI {data.rsi.toFixed(0)} · ADX {data.adx.toFixed(0)} — used as context for all coin signals
        </p>
      </CardContent>
    </Card>
  );
}
