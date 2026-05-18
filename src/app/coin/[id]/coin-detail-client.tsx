"use client";

import { useMemo, useState } from "react";
import { recentChartTrend } from "@/engines/crypto-timing-engine";
import { useSearchParams } from "next/navigation";
import { PriceChart } from "@/components/charts/price-chart";
import { SignalCard } from "@/components/signals/signal-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { usePrediction } from "@/hooks/use-prediction";
import { useMarkets } from "@/hooks/use-markets";
import { useWatchlistStore } from "@/stores/watchlist-store";
import { useCryptoSettingsStore } from "@/stores/crypto-settings-store";
import type { Timeframe } from "@/types";
import { QualityBadge } from "@/components/signals/quality-badge";
import { formatPairLabel } from "@/config/market";
import { formatUsd } from "@/lib/utils";

const TIMEFRAMES: Timeframe[] = ["1m", "5m", "15m", "1h", "4h", "1D", "1W"];

export function CoinDetailClient({ coinId }: { coinId: string }) {
  const searchParams = useSearchParams();
  const symbol = (searchParams.get("symbol") ?? "BTC").toUpperCase();
  const defaultTf = useCryptoSettingsStore((s) => s.defaultTimeframe);
  const [timeframe, setTimeframe] = useState<Timeframe>(defaultTf);
  const [market, setMarket] = useState<"spot" | "futures">("spot");

  const { data: markets } = useMarkets();
  const coin = markets?.find((m) => m.id === coinId || m.symbol === symbol);
  const {
    data: prediction,
    isPending,
    isFetching,
    error,
  } = usePrediction(symbol, coinId, timeframe, market);
  const { has, add, remove } = useWatchlistStore();
  const inWatchlist = has(symbol);

  const chartTrendLabel = useMemo(() => {
    if (!prediction?.candles.length) return null;
    return recentChartTrend(prediction.candles, timeframe);
  }, [prediction?.candles, timeframe]);

  /**
   * Single source of truth for the price shown on this page = the latest
   * candle close from the chart. Avoids the CoinGecko-vs-Binance discrepancy
   * (e.g. $1.27 header vs $7.60 chart for DOT) which made the entry banner
   * report nonsense distances.
   */
  const chartPrice = prediction?.candles?.[prediction.candles.length - 1]?.close;
  const livePrice = useMemo(() => {
    if (!chartPrice) return coin?.price ?? prediction?.indicators.ema9 ?? 0;
    const fallback = coin?.price;
    if (fallback && fallback > 0) {
      const drift = Math.abs(fallback - chartPrice) / chartPrice;
      if (drift > 0.15) return chartPrice;
      return chartPrice;
    }
    return chartPrice;
  }, [chartPrice, coin?.price, prediction?.indicators.ema9]);

  const livePriceSignal = useMemo(() => {
    if (!prediction?.signal) return prediction?.signal;
    return { ...prediction.signal, currentPrice: livePrice };
  }, [prediction?.signal, livePrice]);

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{coin?.name ?? symbol}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            {formatPairLabel(symbol)}
            {prediction?.signal?.quality && (
              <QualityBadge quality={prediction.signal.quality} compact />
            )}
          </p>
          <p className="font-mono text-lg">{formatUsd(livePrice)}</p>
        </div>
        <Button
          variant={inWatchlist ? "secondary" : "default"}
          onClick={() => (inWatchlist ? remove(symbol) : add(symbol, coinId))}
        >
          {inWatchlist ? "Remove Watchlist" : "Add Watchlist"}
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        {TIMEFRAMES.map((tf) => (
          <Button key={tf} size="sm" variant={timeframe === tf ? "default" : "outline"} onClick={() => setTimeframe(tf)}>
            {tf}
          </Button>
        ))}
        <Button size="sm" variant={market === "spot" ? "default" : "outline"} onClick={() => setMarket("spot")}>Spot</Button>
        <Button size="sm" variant={market === "futures" ? "default" : "outline"} onClick={() => setMarket("futures")}>Futures</Button>
        {isFetching && !isPending && (
          <span className="text-xs text-muted-foreground ml-2 animate-pulse">
            Updating…
          </span>
        )}
      </div>

      {isPending ? (
        <Skeleton className="h-[400px]" />
      ) : prediction ? (
        <div className={isFetching ? "opacity-70 transition-opacity" : "transition-opacity"}>
          <PriceChart candles={prediction.candles} signal={prediction.signal} />
          {livePriceSignal && (
            <SignalCard signal={livePriceSignal} chartCandles={prediction.candles} />
          )}
          <section className="grid md:grid-cols-2 gap-4 mt-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Indicators</CardTitle></CardHeader>
              <CardContent className="text-sm font-mono space-y-1">
                <p>RSI: {prediction.indicators.rsi.toFixed(1)}</p>
                <p>MACD Hist: {prediction.indicators.macd.histogram.toFixed(4)}</p>
                <p>
                  Chart trend ({timeframe}): {chartTrendLabel ?? "—"}
                </p>
                <p>
                  EMA structure: {prediction.indicators.trend} ({prediction.indicators.trendStrength.toFixed(0)}%)
                </p>
                <p>ATR: {formatUsd(prediction.indicators.atr)}</p>
                <p>VWAP: {formatUsd(prediction.indicators.vwap)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">AI Commentary</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">{prediction.commentary}</CardContent>
            </Card>
          </section>
        </div>
      ) : error ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-destructive">Data unavailable</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Couldn&apos;t load {timeframe} candles for {symbol}.</p>
            <p className="font-mono text-xs break-words">
              {error instanceof Error ? error.message : String(error)}
            </p>
            <p>Try another timeframe, switch quote pair, or check upstream provider status.</p>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
