"use client";

import { SignalCard } from "@/components/signals/signal-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useIndiaMarkets } from "@/hooks/use-india-markets";
import { useIndiaBatchSignals } from "@/hooks/use-india-batch-signals";
import { useIndiaOptions, type IndiaUnderlying } from "@/hooks/use-india-options";
import { useIndiaSettingsStore } from "@/stores/india-settings-store";
import { formatInr } from "@/lib/utils";
import { INDIA_FNO_UNDERLYINGS } from "@/config/india-stocks";

export default function IndiaFuturesPage() {
  const tf = useIndiaSettingsStore((s) => s.defaultTimeframe);
  const { data: stocks } = useIndiaMarkets();
  const indexStocks = stocks?.filter((s) =>
    INDIA_FNO_UNDERLYINGS.some((u) => u.symbol === s.symbol)
  );
  const { data: signals, isLoading } = useIndiaBatchSignals(
    indexStocks?.length ? indexStocks : stocks?.filter((s) => s.segment === "index"),
    "india_futures",
    tf,
    6
  );

  const niftyOpts = useIndiaOptions("NIFTY");
  const bankOpts = useIndiaOptions("BANKNIFTY");

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">India Futures (F&O)</h1>
        <p className="text-sm text-muted-foreground">
          NIFTY · Bank Nifty · Fin Nifty — INR index futures bias from PCR & OI
        </p>
      </header>

      <section className="grid sm:grid-cols-2 gap-4">
        {[niftyOpts, bankOpts].map((q, i) => {
          const und = (["NIFTY", "BANKNIFTY"] as IndiaUnderlying[])[i];
          const m = q.data?.metrics;
          return (
            <Card key={und}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex justify-between">
                  {und} F&O
                  {m && (
                    <Badge variant={m.trendBias === "bullish" ? "bull" : m.trendBias === "bearish" ? "bear" : "secondary"}>
                      {m.trendBias}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs font-mono space-y-1">
                {q.isLoading ? (
                  <Skeleton className="h-16" />
                ) : m ? (
                  <>
                    <p>Spot: {formatInr(m.underlyingPrice)}</p>
                    <p>PCR: {m.pcr.toFixed(2)}</p>
                    <p>Max pain: {formatInr(m.maxPainStrike, 0)}</p>
                    <p>Call OI: {(m.totalCallOi / 1e5).toFixed(1)}L</p>
                    <p>Put OI: {(m.totalPutOi / 1e5).toFixed(1)}L</p>
                  </>
                ) : (
                  <p className="text-muted-foreground">Enable demo mode if NSE blocked</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </section>

      <h2 className="font-semibold">Index Futures Signals</h2>
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">{[1, 2].map((i) => <Skeleton key={i} className="h-44" />)}</div>
      ) : signals?.length ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {signals.map((s) => (
            <SignalCard key={s.id} signal={s} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No index futures signals above threshold.</p>
      )}
    </section>
  );
}
