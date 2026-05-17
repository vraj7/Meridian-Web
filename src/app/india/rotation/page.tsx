"use client";

import { IndiaDisclaimer } from "@/components/india/india-disclaimer";
import { IndiaTerminalNav } from "@/components/india/india-terminal-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useIndiaTerminal } from "@/hooks/use-india-terminal";
import { formatPercent } from "@/lib/utils";

export default function IndiaRotationPage() {
  const { data, isLoading } = useIndiaTerminal();
  const leading = data?.sectors.filter((s) => s.rotationSignal === "leading") ?? [];
  const lagging = data?.sectors.filter((s) => s.rotationSignal === "lagging") ?? [];

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Sector Rotation</h1>
        <p className="text-sm text-muted-foreground">Leading vs lagging sectors · smart money rotation</p>
      </header>
      <IndiaTerminalNav />
      <IndiaDisclaimer />

      {isLoading ? (
        <Skeleton className="h-40" />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-bull">Leading sectors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {leading.map((s) => (
                <div key={s.id} className="flex justify-between text-sm">
                  <span>{s.name}</span>
                  <span className="font-mono text-bull">{formatPercent(s.avgChange24h)}</span>
                </div>
              ))}
              {leading.length === 0 && (
                <p className="text-xs text-muted-foreground">No clear leaders yet</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-bear">Lagging sectors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {lagging.map((s) => (
                <div key={s.id} className="flex justify-between text-sm">
                  <span>{s.name}</span>
                  <span className="font-mono text-bear">{formatPercent(s.avgChange24h)}</span>
                </div>
              ))}
              {lagging.length === 0 && (
                <p className="text-xs text-muted-foreground">No clear laggards yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Rotation playbook</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>When banking leads with positive news bias, overweight HDFC BANK, ICICI, SBIN, AXISBANK.</p>
          <p>When IT lags on global macro, reduce bullish conviction on TCS, INFY, WIPRO.</p>
          <p>Align stock picks with leading sectors; avoid counter-trend trades in lagging buckets.</p>
        </CardContent>
      </Card>
    </section>
  );
}
