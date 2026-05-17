"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatInr, formatPercent } from "@/lib/utils";
import type { IndiaTerminalSignal } from "@/types/india-advanced";

export function TerminalSignalCard({ signal }: { signal: IndiaTerminalSignal }) {
  const acc = signal.accuracy;
  const variant =
    acc.action.includes("BUY") ? "bull" : acc.action.includes("SELL") ? "bear" : "secondary";

  return (
    <Card className="border-border/80">
      <CardHeader className="flex flex-row justify-between gap-2 pb-2">
        <CardTitle className="text-base">
          <Link href={`/india/stock/${signal.symbol}`} className="hover:text-primary">
            {signal.pairLabel}
          </Link>
          <p className="text-xs font-normal text-muted-foreground capitalize">
            {signal.sectorName} · {signal.regime.replace(/_/g, " ")}
          </p>
        </CardTitle>
        <Badge variant={variant}>{acc.action}</Badge>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">LTP</span>
          <span className="font-mono font-bold">
            {formatInr(signal.currentPrice)}{" "}
            <span className={signal.change24h >= 0 ? "text-bull text-xs" : "text-bear text-xs"}>
              {formatPercent(signal.change24h)}
            </span>
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Confidence</p>
            <p className="font-mono font-semibold">{acc.confidence}%</p>
          </div>
          <div>
            <p className="text-muted-foreground">Probability</p>
            <p className="font-mono">{acc.probability}%</p>
          </div>
          <div>
            <p className="text-muted-foreground">Risk</p>
            <p className="font-mono text-warning">{acc.risk}%</p>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${acc.confidence}%` }} />
        </div>
        {acc.confirmations.length > 0 && (
          <ul className="text-xs text-muted-foreground space-y-0.5">
            {acc.confirmations.slice(0, 3).map((c) => (
              <li key={c}>✓ {c}</li>
            ))}
          </ul>
        )}
        {acc.warnings.length > 0 && (
          <p className="text-xs text-warning">{acc.warnings[0]}</p>
        )}
      </CardContent>
    </Card>
  );
}
