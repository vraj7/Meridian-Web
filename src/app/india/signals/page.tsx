"use client";

import { IndiaDisclaimer } from "@/components/india/india-disclaimer";
import { IndiaTerminalNav } from "@/components/india/india-terminal-nav";
import { TerminalSignalCard } from "@/components/india/terminal-signal-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useIndiaTerminal } from "@/hooks/use-india-terminal";

export default function IndiaSignalsPage() {
  const { data, isLoading } = useIndiaTerminal();

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">AI Signals</h1>
        <p className="text-sm text-muted-foreground">
          Multi-confirmation: technical + sector + news + OI · Regime: {data?.regimeLabel ?? "—"}
        </p>
      </header>
      <IndiaTerminalNav />
      <IndiaDisclaimer />

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : (
        <>
          <section>
            <h2 className="text-sm font-semibold text-bull mb-2">Bullish ({data?.buySignals.length ?? 0})</h2>
            <div className="grid md:grid-cols-2 gap-3">
              {data?.buySignals.map((s) => (
                <TerminalSignalCard key={s.id} signal={s} />
              ))}
            </div>
          </section>
          <section>
            <h2 className="text-sm font-semibold text-bear mb-2">Bearish ({data?.sellSignals.length ?? 0})</h2>
            <div className="grid md:grid-cols-2 gap-3">
              {data?.sellSignals.map((s) => (
                <TerminalSignalCard key={s.id} signal={s} />
              ))}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
