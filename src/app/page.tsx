"use client";

import Link from "next/link";
import { useMemo } from "react";
import { MarketTrendCard } from "@/components/signals/market-trend-card";
import { SignalCard } from "@/components/signals/signal-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useMarkets, useBtcDominance } from "@/hooks/use-markets";
import { useSentiment } from "@/hooks/use-sentiment";
import { LoadMoreCryptoButton } from "@/components/signals/load-more-crypto-button";
import { usePaginatedCryptoScan } from "@/hooks/use-paginated-crypto-scan";
import { QualityBadge } from "@/components/signals/quality-badge";
import { useLivePrices } from "@/hooks/use-live-prices";
import { generateMarketCommentary } from "@/engines/prediction-engine";
import { formatUsdPriceLabel } from "@/config/market";
import { formatCompact, formatPercent, formatUsd } from "@/lib/utils";
import { RelaxedCryptoToggle } from "@/components/signals/relaxed-crypto-toggle";
import { CRYPTO_SCAN_BATCH_SIZE } from "@/config/crypto-scan";
import { useCryptoSettingsStore } from "@/stores/crypto-settings-store";

export default function DashboardPage() {
  const defaultTf = useCryptoSettingsStore((s) => s.defaultTimeframe);
  const relaxed = useCryptoSettingsStore((s) => s.relaxedCryptoSignals);
  const { data: markets, isLoading } = useMarkets();
  const { data: dominance } = useBtcDominance();
  const { data: sentiment } = useSentiment();
  const spotScan = usePaginatedCryptoScan(markets, "spot", defaultTf, CRYPTO_SCAN_BATCH_SIZE);
  const futuresScan = usePaginatedCryptoScan(markets, "futures", defaultTf, CRYPTO_SCAN_BATCH_SIZE);
  const spotSignals = spotScan.signals;
  const spotGrades = spotScan.grades;
  const signalsLoading = spotScan.isLoading;
  const futuresSignals = futuresScan.signals;

  const symbols = useMemo(() => markets?.slice(0, 15).map((m) => m.symbol) ?? [], [markets]);
  const livePrices = useLivePrices(symbols);

  const btc = markets?.find((m) => m.symbol === "BTC");
  const btcPrice = livePrices.BTC ?? btc?.price;
  const commentary = generateMarketCommentary(
    btc?.change24h ?? 0,
    dominance ?? 54,
    sentiment?.fearGreed ?? 50,
    (spotSignals?.length ?? 0) + (futuresSignals?.length ?? 0)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">Spot, futures, and market context at a glance</p>
        </div>
        <RelaxedCryptoToggle className="sm:max-w-sm" />
      </div>

      <MarketTrendCard />

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <MetricCard label="BTC/USD" value={btcPrice ? formatUsd(btcPrice) : "—"} sub={btc ? formatPercent(btc.change24h) : ""} loading={isLoading} />
        <MetricCard label="BTC Dominance" value={dominance ? `${dominance.toFixed(1)}%` : "—"} loading={!dominance} />
        <MetricCard label="Fear & Greed" value={sentiment ? String(sentiment.fearGreed) : "—"} sub={sentiment?.fearGreedLabel} loading={!sentiment} />
        <MetricCard
          label="Spot Signals"
          value={String(spotSignals?.length ?? 0)}
          sub={relaxed ? "relaxed filters" : "strict filters"}
        />
        <MetricCard
          label="Futures Signals"
          value={String(futuresSignals?.length ?? 0)}
          sub={relaxed ? "relaxed filters" : "strict filters"}
        />
        <MetricCard label="Sentiment" value={sentiment ? `${(sentiment.overall * 100).toFixed(0)}` : "—"} sub="score" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">AI Market Commentary</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{commentary}</CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Top Spot Signals</h2>
            <Link href="/spot" className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">View all</Link>
          </div>
          {signalsLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}</div>
          ) : spotSignals?.length ? (
            <div className="grid gap-3 sm:grid-cols-2">{spotSignals.slice(0, 4).map((s) => <SignalCard key={s.id} signal={s} />)}</div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {relaxed
                ? "No spot setups even with relaxed filters."
                : 'No spot signals in strict mode — use “Show more setups” above.'}
            </p>
          )}
          <div className="mt-3">
            <LoadMoreCryptoButton
              onLoadMore={spotScan.loadMoreCoins}
              onScanAll={spotScan.scanAllBatches}
              loading={spotScan.isFetching}
              scanningAll={spotScan.isScanningAll}
              scanAllProgress={spotScan.scanAllProgress}
              isFullScanActive={spotScan.isFullScanActive}
              pageInfo={spotScan.pageInfo}
              pageSize={CRYPTO_SCAN_BATCH_SIZE}
            />
          </div>
        </section>
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Futures LONG / SHORT</h2>
            <Link href="/futures" className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">View all</Link>
          </div>
          {futuresScan.isLoading ? (
            <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-40" />)}</div>
          ) : futuresSignals?.length ? (
            <div className="grid gap-3 sm:grid-cols-2">{futuresSignals.slice(0, 4).map((s) => <SignalCard key={s.id} signal={s} />)}</div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {relaxed
                ? "No futures setups in this batch."
                : "No futures signals in this batch — scan next coins or use relaxed mode."}
            </p>
          )}
          <div className="mt-3">
            <LoadMoreCryptoButton
              onLoadMore={futuresScan.loadMoreCoins}
              onScanAll={futuresScan.scanAllBatches}
              loading={futuresScan.isFetching}
              scanningAll={futuresScan.isScanningAll}
              scanAllProgress={futuresScan.scanAllProgress}
              isFullScanActive={futuresScan.isFullScanActive}
              pageInfo={futuresScan.pageInfo}
              pageSize={CRYPTO_SCAN_BATCH_SIZE}
            />
          </div>
        </section>
      </div>

      <section>
        <h2 className="font-semibold mb-3">Delta futures universe</h2>
        <p className="text-xs text-muted-foreground mb-2">
          Coins with perpetual futures on Delta Exchange (stables excluded). Prices from CoinGecko.
        </p>
        {isLoading ? (
          <Skeleton className="h-64" />
        ) : (
          <div className="surface overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground text-left">
                  <th className="p-3">#</th>
                  <th className="p-3">Asset</th>
                  <th className="p-3 text-center">Grade</th>
                  <th className="p-3 text-right">{formatUsdPriceLabel()}</th>
                  <th className="p-3 text-right hidden sm:table-cell">24h</th>
                  <th className="p-3 text-right hidden md:table-cell">Mkt Cap</th>
                </tr>
              </thead>
              <tbody>
                {markets?.slice(0, 20).map((coin) => {
                  const price = livePrices[coin.symbol] ?? coin.price;
                  return (
                    <tr key={coin.id} className="border-b border-border/40 hover:bg-accent/30">
                      <td className="p-3 text-muted-foreground">{coin.rank}</td>
                      <td className="p-3">
                        <Link href={`/coin/${coin.id}?symbol=${coin.symbol}`} className="font-medium hover:text-primary">
                          {coin.symbol}
                        </Link>
                        <span className="text-muted-foreground text-xs ml-2 hidden sm:inline">{coin.name}</span>
                      </td>
                      <td className="p-3 text-center">
                        <QualityBadge quality={spotGrades?.[coin.symbol]?.quality} compact />
                      </td>
                      <td className="p-3 text-right font-mono">{formatUsd(price)}</td>
                      <td className={`p-3 text-right hidden sm:table-cell ${coin.change24h >= 0 ? "text-bull" : "text-bear"}`}>
                        {formatPercent(coin.change24h)}
                      </td>
                      <td className="p-3 text-right hidden md:table-cell text-muted-foreground">{formatCompact(coin.marketCap)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {sentiment?.headlines?.length ? (
        <section>
          <h2 className="font-semibold mb-3">Latest Headlines</h2>
          <div className="space-y-2">
            {sentiment.headlines.slice(0, 5).map((n) => (
              <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" className="block surface rounded-lg p-3 hover:bg-accent text-sm transition-colors">
                <Badge variant={n.sentiment === "bullish" ? "bull" : n.sentiment === "bearish" ? "bear" : "secondary"} className="mb-1">
                  {n.sentiment}
                </Badge>
                <p>{n.title}</p>
              </a>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value, sub, loading }: { label: string; value: string; sub?: string; loading?: boolean }) {
  if (loading) return <Skeleton className="h-20 rounded-xl" />;
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold font-mono mt-1">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}
