"use client";

import Link from "next/link";
import { IndiaDisclaimer } from "@/components/india/india-disclaimer";
import { IndiaTerminalNav } from "@/components/india/india-terminal-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getSectorForSymbol } from "@/config/india-sectors";
import { useIndiaMarkets } from "@/hooks/use-india-markets";
import { useIndiaTerminal } from "@/hooks/use-india-terminal";
import { formatInr, formatPercent } from "@/lib/utils";

export default function IndiaScreenerPage() {
  const { data: stocks, isLoading: stocksLoading } = useIndiaMarkets();
  const { data: terminal } = useIndiaTerminal();
  const signalMap = new Map(terminal?.signals.map((s) => [s.symbol, s]) ?? []);
  const equities = stocks?.filter((s) => s.segment === "equity") ?? [];

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Stock Screener</h1>
        <p className="text-sm text-muted-foreground">NIFTY universe with sector and signal overlay</p>
      </header>
      <IndiaTerminalNav />
      <IndiaDisclaimer />

      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="text-left p-3">Symbol</th>
              <th className="text-left p-3">Sector</th>
              <th className="text-right p-3">LTP</th>
              <th className="text-right p-3">Change</th>
              <th className="text-right p-3">Signal</th>
              <th className="text-right p-3">Conf.</th>
            </tr>
          </thead>
          <tbody>
            {equities.map((s) => {
              const sig = signalMap.get(s.symbol);
              return (
                <tr key={s.symbol} className="border-t border-border/40 hover:bg-muted/20">
                  <td className="p-3">
                    <Link href={`/india/stock/${s.symbol}`} className="font-medium hover:text-primary">
                      {s.symbol}
                    </Link>
                  </td>
                  <td className="p-3 text-xs capitalize text-muted-foreground">
                    {getSectorForSymbol(s.symbol).replace(/_/g, " ")}
                  </td>
                  <td className="p-3 text-right font-mono">{formatInr(s.price)}</td>
                  <td
                    className={`p-3 text-right font-mono ${s.change24h >= 0 ? "text-bull" : "text-bear"}`}
                  >
                    {formatPercent(s.change24h)}
                  </td>
                  <td className="p-3 text-right text-xs">{sig?.accuracy.action ?? "—"}</td>
                  <td className="p-3 text-right font-mono text-xs">
                    {sig ? `${sig.accuracy.confidence}%` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {stocksLoading && <Skeleton className="h-40 m-4" />}
      </div>

      {!stocksLoading && equities.length === 0 && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            No equity data — try demo mode in Settings.
          </CardContent>
        </Card>
      )}
    </section>
  );
}
