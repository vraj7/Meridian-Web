"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/utils";
import type { FuturesIntradaySignal } from "@/types/futures-intraday";

export function FuturesMtfDetailPanel({
  signal,
  onClose,
}: {
  signal: FuturesIntradaySignal;
  onClose: () => void;
}) {
  const ind = signal.indicators15m;

  return (
    <Card className="border-primary/30">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            {signal.pairLabel}
            <Badge variant={signal.direction === "LONG" ? "bull" : "bear"}>
              {signal.direction}
            </Badge>
            <Badge variant="default">{signal.setupGrade}</Badge>
            <span className="text-sm font-normal text-muted-foreground">
              {signal.confidence}% · {signal.confidenceTier}
            </span>
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">{signal.positionPlan}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close detail">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2 text-sm">
        <section className="space-y-3">
          <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
            Trend summary
          </h3>
          <ul className="grid grid-cols-2 gap-2 font-mono text-xs">
            {(["5m", "15m", "1h", "4h", "1d"] as const).map((tf) => (
              <li key={tf} className="flex justify-between border-b border-border/50 py-1">
                <span className="text-muted-foreground">{tf}</span>
                <span>{signal.trendByTf[tf]}</span>
              </li>
            ))}
          </ul>

          <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground pt-2">
            Market structure
          </h3>
          <ul className="text-xs space-y-1 text-muted-foreground">
            {signal.structure.events.map((e) => (
              <li key={e}>· {e}</li>
            ))}
            <li>
              BOS {signal.structure.bos ? "yes" : "no"} · CHOCH {signal.structure.choch ? "yes" : "no"}
            </li>
          </ul>

          <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground pt-2">
            Indicators (15m)
          </h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs">
            <span>RSI {ind.rsi.toFixed(1)}</span>
            <span>ADX {ind.adx.toFixed(1)}</span>
            <span>MACD hist {ind.macd.histogram.toFixed(4)}</span>
            <span>Stoch RSI {ind.stochRsi.toFixed(0)}</span>
            <span>ATR {formatUsd(ind.atr)}</span>
            <span>VWAP {formatUsd(ind.vwap)}</span>
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
            Smart money & liquidity
          </h3>
          <ul className="text-xs space-y-1">
            {signal.smcNotes.map((n) => (
              <li key={n}>· {n}</li>
            ))}
            <li className="text-muted-foreground">
              Stop-hunt risk score: {signal.liquidity.stopHuntRisk}
            </li>
          </ul>

          <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground pt-2">
            Entry timing
          </h3>
          <p className="text-xs text-muted-foreground">{signal.entryTimingNote}</p>
          <p className="text-xs font-mono">
            Zone ${signal.entryZone[0].toFixed(4)} – ${signal.entryZone[1].toFixed(4)} · ideal $
            {signal.idealEntryPrice.toFixed(4)} · {signal.distanceToEntryPct}% from ideal
          </p>

          <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground pt-2">
            Risk & targets
          </h3>
          <div className="font-mono text-xs space-y-1">
            <p>Entry {formatUsd(signal.entry)}</p>
            <p>Stop {formatUsd(signal.stopLoss)} (quality {signal.stopLossQuality})</p>
            <p>TP1 {formatUsd(signal.tp1)} · TP2 {formatUsd(signal.tp2)} · TP3 {formatUsd(signal.tp3)}</p>
            {signal.tp4 ? <p>TP4 {formatUsd(signal.tp4)}</p> : null}
            <p>
              Risk {signal.riskPercent.toFixed(2)}% · Reward {signal.rewardPercent.toFixed(2)}% · R:R{" "}
              {signal.riskReward.toFixed(1)}
            </p>
            <p>Win est. {signal.winProbability}% · Hold ~{signal.holdingMinutes}m</p>
          </div>

          <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground pt-2">
            Context
          </h3>
          <p className="text-xs text-muted-foreground">{signal.volumeNote}</p>
          <p className="text-xs text-muted-foreground">{signal.fundingNote}</p>
          <p className="text-xs text-muted-foreground">{signal.oiNote}</p>
          <p className="text-xs text-muted-foreground">{signal.btcNote}</p>

          <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground pt-2">
            AI reasoning
          </h3>
          <p className="text-xs leading-relaxed">{signal.aiReasoning}</p>

          {signal.invalidation.length ? (
            <>
              <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground pt-2">
                Invalidation
              </h3>
              <ul className="text-xs text-muted-foreground">
                {signal.invalidation.map((x) => (
                  <li key={x}>· {x}</li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      </CardContent>
    </Card>
  );
}
