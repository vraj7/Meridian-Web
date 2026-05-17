"use client";

import { useQuery } from "@tanstack/react-query";
import { MarketTrendCard } from "@/components/signals/market-trend-card";
import { TradingWorkflowCard } from "@/components/signals/trading-workflow-card";
import { CryptoSignalLogic } from "@/components/signals/crypto-signal-logic";
import { SignalCard } from "@/components/signals/signal-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useMarkets } from "@/hooks/use-markets";
import { CoinGradesTable } from "@/components/signals/coin-grades-table";
import { LoadMoreCryptoButton } from "@/components/signals/load-more-crypto-button";
import { usePaginatedCryptoScan } from "@/hooks/use-paginated-crypto-scan";
import { fetchFuturesMetrics } from "@/services/futures";
import { RelaxedCryptoToggle } from "@/components/signals/relaxed-crypto-toggle";
import { CRYPTO_SCAN_BATCH_SIZE } from "@/config/crypto-scan";
import { useCryptoSettingsStore } from "@/stores/crypto-settings-store";
import { formatPairLabel } from "@/config/market";
import { formatCompact } from "@/lib/utils";

export default function FuturesPage() {
  const demoMode = useCryptoSettingsStore((s) => s.demoMode);
  const tf = useCryptoSettingsStore((s) => s.defaultTimeframe);
  const minConfidence = useCryptoSettingsStore((s) => s.minConfidence);
  const relaxed = useCryptoSettingsStore((s) => s.relaxedCryptoSignals);
  const { data: markets } = useMarkets();
  const {
    signals,
    grades,
    pageMarkets,
    pageInfo,
    loadMoreCoins,
    scanAllBatches,
    isScanningAll,
    scanAllProgress,
    isFullScanActive,
    isLoading,
    isFetching,
  } = usePaginatedCryptoScan(markets, "futures", tf, CRYPTO_SCAN_BATCH_SIZE);

  const nearMissCount =
    grades &&
    Object.values(grades).filter(
      (g) => g.confidence >= minConfidence - 5 && g.action === "WAIT"
    ).length;

  const top = pageMarkets.slice(0, 4);
  const { data: metrics } = useQuery({
    queryKey: ["futures-metrics", top.map((m) => m.symbol).join(","), demoMode],
    queryFn: async () => Promise.all(top.map((m) => fetchFuturesMetrics(m.symbol, demoMode))),
    enabled: top.length > 0 && !isLoading,
    staleTime: 90_000,
    gcTime: 300_000,
  });

  const scanButtons = (
    <LoadMoreCryptoButton
      onLoadMore={loadMoreCoins}
      onScanAll={scanAllBatches}
      loading={isFetching}
      scanningAll={isScanningAll}
      scanAllProgress={scanAllProgress}
      isFullScanActive={isFullScanActive}
      pageInfo={pageInfo}
      pageSize={CRYPTO_SCAN_BATCH_SIZE}
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Futures</h1>
          <p className="text-sm text-muted-foreground">
            Delta Exchange perps · USD-margined · LONG / SHORT · Funding · OI
          </p>
        </div>
        <RelaxedCryptoToggle className="sm:max-w-md" />
      </div>

      <MarketTrendCard />
      <TradingWorkflowCard />
      <CryptoSignalLogic />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics?.map((m) => (
          <Card key={m.symbol}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex justify-between">
                {formatPairLabel(m.symbol)}
                {m.squeezeRisk !== "none" && <Badge variant="warning">Squeeze</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-1 font-mono">
              <p>Funding: {(m.fundingRate * 100).toFixed(4)}%</p>
              <p>OI: {formatCompact(m.openInterest)}</p>
              <p>L/S: {m.longShortRatio.toFixed(2)}</p>
              {m.volatilityAlert && <p className="text-warning">Volatility alert</p>}
            </CardContent>
          </Card>
        )) ?? <Skeleton className="h-24 col-span-4" />}
      </div>

      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
          <h2 className="font-semibold">Setup grades (this batch)</h2>
          {scanButtons}
        </div>
        {isLoading && !grades ? (
          <Skeleton className="h-64" />
        ) : pageMarkets.length ? (
          <CoinGradesTable markets={pageMarkets} grades={grades} marketLabel="futures" />
        ) : null}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-semibold">Futures Signals</h2>
        {scanButtons}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : signals?.length ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {signals.map((s) => (
              <SignalCard key={s.id} signal={s} />
            ))}
          </div>
          <div className="flex justify-center">{scanButtons}</div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground space-y-3">
          <p>
            {relaxed
              ? "No futures setups in this batch."
              : `No futures signals in this batch (min ${minConfidence}% confidence).`}
          </p>
          {nearMissCount ? (
            <p>
              {nearMissCount} coin{nearMissCount === 1 ? "" : "s"} near threshold in this batch — see
              grades above.
            </p>
          ) : null}
          <p>Scan the next coins to check another slice of the universe.</p>
          {scanButtons}
        </div>
      )}
    </div>
  );
}
