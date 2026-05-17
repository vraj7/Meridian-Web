"use client";

import { IndiaDisclaimer } from "@/components/india/india-disclaimer";
import { IndiaTerminalNav } from "@/components/india/india-terminal-nav";
import { SectorHeatmap } from "@/components/india/sector-heatmap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { INDIA_SECTORS } from "@/config/india-sectors";
import { useIndiaTerminal } from "@/hooks/use-india-terminal";
import { formatPercent } from "@/lib/utils";

export default function IndiaSectorsPage() {
  const { data, isLoading } = useIndiaTerminal();

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Sector Analysis</h1>
        <p className="text-sm text-muted-foreground">
          Industry momentum, news bias, and rotation rankings
        </p>
      </header>
      <IndiaTerminalNav />
      <IndiaDisclaimer />

      {isLoading ? (
        <Skeleton className="h-48" />
      ) : (
        <>
          <SectorHeatmap sectors={data?.sectors ?? []} />
          <div className="grid md:grid-cols-2 gap-3">
            {(data?.sectors ?? []).map((s) => (
              <Card key={s.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex justify-between">
                    {s.name}
                    <span className="text-muted-foreground font-normal">Rank #{s.strengthRank}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-1">
                  <p>Avg change: {formatPercent(s.avgChange24h)}</p>
                  <p>Momentum score: {s.momentum.toFixed(2)}</p>
                  <p>News bias: {s.newsBias.toFixed(2)}</p>
                  <p className="capitalize">Rotation: {s.rotationSignal}</p>
                  <p className="text-muted-foreground">{s.stockCount} tracked stocks</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Sector universe</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {INDIA_SECTORS.map((s) => (
            <span key={s.id} className="text-xs px-2 py-1 rounded-md bg-muted">
              {s.name}
            </span>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
