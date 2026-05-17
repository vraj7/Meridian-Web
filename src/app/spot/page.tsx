"use client";

import { MarketTrendCard } from "@/components/signals/market-trend-card";
import { TradingWorkflowCard } from "@/components/signals/trading-workflow-card";
import { CryptoSignalLogic } from "@/components/signals/crypto-signal-logic";
import { SignalCard } from "@/components/signals/signal-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarkets } from "@/hooks/use-markets";
import { CoinGradesTable } from "@/components/signals/coin-grades-table";
import { LoadMoreCryptoButton } from "@/components/signals/load-more-crypto-button";
import { RelaxedCryptoToggle } from "@/components/signals/relaxed-crypto-toggle";
import { usePaginatedCryptoScan } from "@/hooks/use-paginated-crypto-scan";
import { CRYPTO_SCAN_BATCH_SIZE } from "@/config/crypto-scan";
import { useCryptoSettingsStore } from "@/stores/crypto-settings-store";

export default function SpotSignalsPage() {
  const tf = useCryptoSettingsStore((s) => s.defaultTimeframe);
  const relaxed = useCryptoSettingsStore((s) => s.relaxedCryptoSignals);
  const { data: markets, isLoading: mLoading } = useMarkets();
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
  } = usePaginatedCryptoScan(markets, "spot", tf, CRYPTO_SCAN_BATCH_SIZE);

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
          <h1 className="text-2xl font-semibold tracking-tight">Spot</h1>
          <p className="text-sm text-muted-foreground">
            Spot pairs · BUY / SELL / WAIT · switch USD / USDT in the header
          </p>
        </div>
        <RelaxedCryptoToggle className="sm:max-w-md" />
      </div>

      <MarketTrendCard />
      <TradingWorkflowCard />
      <CryptoSignalLogic />

      <section>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
          <h2 className="font-semibold">
            {isFullScanActive ? "Setup grades (full scan)" : "Setup grades (this batch)"}
          </h2>
          {scanButtons}
        </div>
        {mLoading || (isLoading && !grades) ? (
          <Skeleton className="h-64" />
        ) : pageMarkets.length ? (
          <CoinGradesTable markets={pageMarkets} grades={grades} marketLabel="spot" />
        ) : null}
      </section>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-semibold">Tradeable signals</h2>
        {!isLoading && !mLoading && (
          <p className="text-xs text-muted-foreground">
            {signals?.length
              ? `${signals.length} setup${signals.length === 1 ? "" : "s"} · ${relaxed ? "relaxed" : "strict"} filters`
              : grades && Object.keys(grades).length > 0
                ? "No tradeable entries in this batch — try “Scan next coins” or relaxed mode"
                : "Scanning…"}
          </p>
        )}
      </div>

      {mLoading || isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
          <div className="flex justify-center pt-2">{scanButtons}</div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            {relaxed
              ? "No spot setups in this batch. Scan the next coins or try another timeframe."
              : "No spot signals in this batch. Tap “Scan next coins”, enable relaxed mode, or lower Min confidence in Settings."}
          </p>
          {scanButtons}
        </div>
      )}
    </div>
  );
}
