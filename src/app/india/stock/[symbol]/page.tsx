"use client";

import { use, useState } from "react";
import { PriceChart } from "@/components/charts/price-chart";
import { SignalCard } from "@/components/signals/signal-card";
import { OptionSignalCard } from "@/components/signals/option-signal-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useIndiaPrediction } from "@/hooks/use-india-prediction";
import { useIndiaMarkets } from "@/hooks/use-india-markets";
import { useIndiaSettingsStore } from "@/stores/india-settings-store";
import { formatIndiaPairLabel } from "@/config/market";
import type { Timeframe } from "@/types";
import type { IndiaMarketType } from "@/types/india";
import { formatInr } from "@/lib/utils";

const TIMEFRAMES: Timeframe[] = ["1m", "5m", "15m", "1h", "4h", "1D", "1W"];

export default function IndiaStockPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol: raw } = use(params);
  const symbol = raw.toUpperCase();
  const defaultTf = useIndiaSettingsStore((s) => s.defaultTimeframe);
  const [timeframe, setTimeframe] = useState<Timeframe>(defaultTf);
  const [market, setMarket] = useState<IndiaMarketType>("india_equity");

  const { data: stocks } = useIndiaMarkets();
  const stock = stocks?.find((s) => s.symbol === symbol);
  const { data: prediction, isLoading } = useIndiaPrediction(
    symbol,
    stock?.id ?? symbol.toLowerCase(),
    timeframe,
    market
  );

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{stock?.name ?? symbol}</h1>
          <p className="text-sm text-muted-foreground">{formatIndiaPairLabel(symbol)}</p>
          <p className="font-mono text-lg">{formatInr(stock?.price ?? prediction?.indicators.ema9 ?? 0)}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(["india_equity", "india_futures", "india_options"] as IndiaMarketType[]).map((m) => (
            <Button key={m} size="sm" variant={market === m ? "default" : "outline"} onClick={() => setMarket(m)}>
              {m === "india_equity" ? "Cash" : m === "india_futures" ? "Futures" : "Options"}
            </Button>
          ))}
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {TIMEFRAMES.map((tf) => (
          <Button key={tf} size="sm" variant={timeframe === tf ? "default" : "outline"} onClick={() => setTimeframe(tf)}>
            {tf}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-[400px]" />
      ) : prediction ? (
        <>
          <PriceChart candles={prediction.candles} signal={prediction.signal} />
          {prediction.signal && <SignalCard signal={prediction.signal} />}
          {prediction.optionSignals.map((s) => (
            <OptionSignalCard key={s.id} signal={s} />
          ))}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Indicators</CardTitle>
              </CardHeader>
              <CardContent className="text-sm font-mono space-y-1">
                <p>RSI: {prediction.indicators.rsi.toFixed(1)}</p>
                <p>Trend: {prediction.indicators.trend}</p>
                <p>ATR: {formatInr(prediction.indicators.atr)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Commentary</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{prediction.commentary}</CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </section>
  );
}
