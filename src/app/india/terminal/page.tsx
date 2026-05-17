"use client";

import Link from "next/link";
import { IndiaDisclaimer } from "@/components/india/india-disclaimer";
import { IndiaTerminalNav } from "@/components/india/india-terminal-nav";
import { MarketStatusBanner } from "@/components/india/market-status-banner";
import { SectorHeatmap } from "@/components/india/sector-heatmap";
import { TerminalSignalCard } from "@/components/india/terminal-signal-card";
import { FiiDiiPanel } from "@/components/india/fii-dii-panel";
import { OptionsPlaybookSection } from "@/components/india/options-playbook-section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useIndiaMarkets } from "@/hooks/use-india-markets";
import { useIndiaTerminal } from "@/hooks/use-india-terminal";
import { formatInr, formatPercent } from "@/lib/utils";

export default function IndiaTerminalPage() {
  const { data: stocks } = useIndiaMarkets();
  const { data, isLoading } = useIndiaTerminal();
  const indices = stocks?.filter((s) => s.segment === "index") ?? [];

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">India Intelligence Terminal</h1>
        <p className="text-sm text-muted-foreground">
          NSE · Sector rotation · OI · News · Multi-confirmation signals
        </p>
      </header>

      <IndiaTerminalNav />
      <MarketStatusBanner />
      <IndiaDisclaimer />

      {data && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 text-sm">{data.commentary}</CardContent>
        </Card>
      )}

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

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Regime · {data?.regimeLabel ?? "—"}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {data?.news.marketMood && (
                <p>
                  Mood: <span className="capitalize">{data.news.marketMood}</span> · News score{" "}
                  {(data.news.overall * 100).toFixed(0)}
                </p>
              )}
            </CardContent>
          </Card>

          <div>
            <h2 className="text-sm font-semibold mb-2">Sector heatmap</h2>
            {data?.sectors?.length ? (
              <SectorHeatmap sectors={data.sectors} />
            ) : (
              <Skeleton className="h-32" />
            )}
          </div>

          <div>
            <h2 className="text-sm font-semibold mb-2">AI signals (multi-confirmation)</h2>
            <div className="grid md:grid-cols-2 gap-3">
              {data?.signals.slice(0, 6).map((s) => (
                <TerminalSignalCard key={s.id} signal={s} />
              ))}
            </div>
            {data && data.signals.length === 0 && (
              <p className="text-sm text-muted-foreground">No setups above confidence threshold.</p>
            )}
            <Link href="/india/signals" className="text-xs text-primary mt-2 inline-block">
              View all signals →
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <FiiDiiPanel data={data?.fiiDii ?? null} />
          {data?.optionsPlaybooks?.[0] && (
            <OptionsPlaybookSection playbook={data.optionsPlaybooks[0]} />
          )}
        </div>
      </div>
    </section>
  );
}
