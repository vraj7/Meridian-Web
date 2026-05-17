"use client";

import Link from "next/link";
import { SignalCard } from "@/components/signals/signal-card";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatIndiaPriceLabel } from "@/config/market";
import { useIndiaMarkets } from "@/hooks/use-india-markets";
import { useIndiaBatchSignals } from "@/hooks/use-india-batch-signals";
import { useIndiaSettingsStore } from "@/stores/india-settings-store";
import { formatInr, formatPercent } from "@/lib/utils";

export default function IndiaDashboardPage() {
  const tf = useIndiaSettingsStore((s) => s.defaultTimeframe);
  const { data: stocks, isLoading } = useIndiaMarkets();
  const { data: equitySignals, isLoading: sigLoading } = useIndiaBatchSignals(
    stocks,
    "india_equity",
    tf,
    8
  );
  const indices = stocks?.filter((s) => s.segment === "index") ?? [];
  const equities = stocks?.filter((s) => s.segment === "equity").slice(0, 15) ?? [];

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Indian Stock Market</h1>
        <p className="text-sm text-muted-foreground">
          NSE · NIFTY 50 · INR pairs · Cash equity signals
        </p>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {indices.map((idx) => (
          <Card key={idx.symbol}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{idx.name}</p>
              <p className="font-bold font-mono">{formatInr(idx.price)}</p>
              <p className={idx.change24h >= 0 ? "text-bull text-xs" : "text-bear text-xs"}>
                {formatPercent(idx.change24h)}
              </p>
            </CardContent>
          </Card>
        ))}
        {isLoading && <Skeleton className="h-20 col-span-2" />}
      </section>

      <section className="flex flex-wrap gap-3">
        <Link href="/india/terminal" className="text-sm text-primary font-medium hover:underline">
          India Intelligence Terminal →
        </Link>
        <Link href="/india/futures" className="text-sm text-primary hover:underline">
          NSE Futures signals →
        </Link>
        <Link href="/india/picks" className="text-sm text-primary font-medium hover:underline">
          India Picks — BUY/SELL stocks + CALL/PUT →
        </Link>
        <Link href="/india/options" className="text-sm text-primary hover:underline">
          Options chain →
        </Link>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Equity Signals (NIFTY 50)</h2>
        {sigLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}</div>
        ) : equitySignals?.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {equitySignals.map((s) => (
              <SignalCard key={s.id} signal={s} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No high-confidence equity setups.</p>
        )}
      </section>

      <section>
        <h2 className="font-semibold mb-3">{formatIndiaPriceLabel()} — Live</h2>
        {isLoading ? (
          <Skeleton className="h-64" />
        ) : (
          <div className="glass rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground text-left">
                  <th className="p-3">Symbol</th>
                  <th className="p-3 text-right">LTP</th>
                  <th className="p-3 text-right">Change</th>
                </tr>
              </thead>
              <tbody>
                {equities.map((s) => (
                  <tr key={s.id} className="border-b border-border/40 hover:bg-accent/30">
                    <td className="p-3">
                      <Link href={`/india/stock/${s.symbol}`} className="font-medium hover:text-primary">
                        {s.symbol}
                      </Link>
                    </td>
                    <td className="p-3 text-right font-mono">{formatInr(s.price)}</td>
                    <td className={`p-3 text-right ${s.change24h >= 0 ? "text-bull" : "text-bear"}`}>
                      {formatPercent(s.change24h)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
