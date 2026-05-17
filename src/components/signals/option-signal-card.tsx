"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatInr } from "@/lib/utils";
import type { OptionSignal } from "@/types/india";

export function OptionSignalCard({ signal }: { signal: OptionSignal }) {
  const isCall = signal.optionType === "CE";
  const isBuy = signal.side === "buy";
  const variant = isBuy ? (isCall ? "bull" : "bear") : "warning";

  return (
    <Card className="hover:border-primary/30 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between pb-2 gap-2">
        <CardTitle className="text-base leading-tight">
          {signal.pairLabel}
          <span className="block text-xs font-normal text-muted-foreground mt-0.5">
            Strike {formatInr(signal.strike, 0)}
          </span>
        </CardTitle>
        <Badge variant={variant}>{signal.action}</Badge>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/30 p-2">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Index LTP</p>
            <p className="font-mono font-bold">{formatInr(signal.underlyingPrice)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {signal.optionType} premium LTP
            </p>
            <p className="font-mono font-bold text-primary">{formatInr(signal.premiumLtp)}</p>
          </div>
        </div>

        <p className="flex justify-between text-xs">
          <span className="text-muted-foreground">Confidence</span>
          <span className="font-mono font-semibold">{signal.confidence}%</span>
        </p>
        <p className="flex justify-between text-xs">
          <span className="text-muted-foreground">Premium risk (to SL)</span>
          <span className="font-mono text-warning">~{signal.riskPercent}%</span>
        </p>
        <p className="text-xs">
          <span className="text-muted-foreground">Target / SL premium: </span>
          <span className="font-mono text-bull">{formatInr(signal.targetPremium)}</span>
          <span className="text-muted-foreground"> / </span>
          <span className="font-mono text-bear">{formatInr(signal.stopPremium)}</span>
          <span className="text-muted-foreground"> · R:R {signal.riskReward}</span>
        </p>
        <p className="text-xs font-medium">Trade date: {signal.tradeDate}</p>
        <p className="text-xs">
          Entry zone {formatInr(signal.premiumZone[0])} – {formatInr(signal.premiumZone[1])} · Expiry{" "}
          {signal.expiry}
        </p>
        <p className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-2">
          <strong className="text-foreground">Entry:</strong> {signal.entryTiming}
        </p>
        <p className="text-xs text-muted-foreground border-l-2 border-bear/40 pl-2">
          <strong className="text-foreground">Exit:</strong> {signal.exitTiming}
        </p>
        {signal.newsImpact && <p className="text-xs text-muted-foreground">{signal.newsImpact}</p>}
        <ul className="text-xs text-muted-foreground space-y-0.5">
          {signal.confirmations.slice(0, 3).map((c) => (
            <li key={c}>✓ {c}</li>
          ))}
        </ul>
        {signal.warnings.length > 0 && (
          <ul className="text-xs text-warning space-y-0.5">
            {signal.warnings.map((w) => (
              <li key={w}>⚠ {w}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
