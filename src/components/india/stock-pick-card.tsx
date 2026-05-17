"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatInr, formatPercent } from "@/lib/utils";
import type { IndiaStockPick } from "@/types/india";

export function StockPickCard({ pick }: { pick: IndiaStockPick }) {
  const variant =
    pick.action === "BUY" ? "bull" : pick.action === "SELL" ? "bear" : "secondary";

  return (
    <Card className="hover:border-primary/30">
      <CardHeader className="flex flex-row items-start justify-between pb-2 gap-2">
        <CardTitle className="text-base">
          <Link href={`/india/stock/${pick.symbol}`} className="hover:text-primary">
            {pick.pairLabel}
          </Link>
          <p className="text-xs font-normal text-muted-foreground mt-0.5">{pick.name}</p>
        </CardTitle>
        <Badge variant={variant}>{pick.action}</Badge>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="flex justify-between items-baseline">
          <span className="text-muted-foreground">LTP</span>
          <span>
            <span className="font-mono font-bold text-base">{formatInr(pick.currentPrice)}</span>
            <span
              className={`ml-2 text-xs ${pick.change24h >= 0 ? "text-bull" : "text-bear"}`}
            >
              {formatPercent(pick.change24h)}
            </span>
          </span>
        </p>

        <p className="flex justify-between text-xs">
          <span className="text-muted-foreground">Confidence</span>
          <span className="font-mono font-semibold">{pick.confidence}%</span>
        </p>

        <p className="flex justify-between text-xs">
          <span className="text-muted-foreground">Risk (entry → SL)</span>
          <span className="font-mono text-warning">{pick.riskPercent}%</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Suggested capital at risk: ~{pick.suggestedRiskPerTrade}% of portfolio per trade
        </p>

        {pick.buyZone && (
          <p className="text-xs">
            <span className="text-muted-foreground">Buy zone: </span>
            <span className="font-mono">
              {formatInr(pick.buyZone[0])} – {formatInr(pick.buyZone[1])}
            </span>
          </p>
        )}
        <p className="text-xs">
          <span className="text-muted-foreground">Target / SL: </span>
          <span className="font-mono text-bull">{formatInr(pick.targetPrice)}</span>
          {" / "}
          <span className="font-mono text-bear">{formatInr(pick.stopLoss)}</span>
        </p>

        <div className="rounded-lg bg-muted/40 p-2 space-y-1">
          <p className="text-xs font-medium text-primary">Buy date</p>
          <p className="text-xs">{pick.buyDate}</p>
          <p className="text-xs text-muted-foreground">{pick.buyTiming}</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-2 space-y-1">
          <p className="text-xs font-medium text-bear">Sell / exit date</p>
          <p className="text-xs">{pick.sellDate}</p>
          <p className="text-xs text-muted-foreground">{pick.sellTiming}</p>
        </div>

        <div className="border-t border-border/40 pt-2">
          <p className="text-xs font-medium mb-1">Indicator basis</p>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            {pick.indicators.readings.map((r) => (
              <li key={r}>• {r}</li>
            ))}
          </ul>
        </div>

        {!pick.marketWasOpen && (
          <p className="text-xs text-warning">Signal generated while market was closed — validate prices at open</p>
        )}

        <p className="text-xs">
          <span className="text-muted-foreground">Global: </span>
          {pick.globalImpact}
        </p>
      </CardContent>
    </Card>
  );
}
