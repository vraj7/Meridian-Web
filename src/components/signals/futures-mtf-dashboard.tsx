"use client";

import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { FUTURES_INTRADAY_MIN_CONFIDENCE } from "@/config/futures-intraday";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useFuturesMtfFullScan } from "@/hooks/use-futures-mtf-scan";
import { useIntradaySignalNotifications } from "@/hooks/use-intraday-signal-notifications";
import { formatUsd } from "@/lib/utils";
import type { CoinMarket } from "@/types";
import type { FuturesIntradayAssessment, FuturesIntradaySignal } from "@/types/futures-intraday";
import { FuturesMtfDetailPanel } from "./futures-mtf-detail";

function gradeVariant(grade: string): "default" | "bull" | "warning" {
  if (grade === "A+") return "bull";
  if (grade === "A") return "default";
  return "warning";
}

function DirectionBadge({ direction }: { direction: string }) {
  return (
    <Badge variant={direction === "LONG" ? "bull" : "bear"} className="font-mono text-xs">
      {direction}
    </Badge>
  );
}

function statusLabel(a: FuturesIntradayAssessment): string {
  if (a.status === "signal") return "Enter now";
  if (a.status === "watch") return "Wait price";
  if (a.status === "no_data") return "No data";
  if (a.status === "no_bias") return "No bias";
  return "Filtered";
}

export function FuturesMtfDashboard({ markets }: { markets: CoinMarket[] | undefined }) {
  const {
    signals,
    assessments,
    scanned,
    isScanning,
    error,
    progress,
    lastScanAt,
    rescan,
    data,
  } = useFuturesMtfFullScan(markets);
  const [selected, setSelected] = useState<FuturesIntradaySignal | null>(null);
  useIntradaySignalNotifications(signals, lastScanAt);

  const signalBySymbol = useMemo(() => {
    const map = new Map<string, FuturesIntradaySignal>();
    for (const s of signals) map.set(s.symbol, s);
    return map;
  }, [signals]);

  const loading = isScanning && !data;

  if (!markets?.length && !loading) {
    return (
      <p className="text-sm text-muted-foreground">Loading futures universe…</p>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 space-y-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-64 w-full" />
          {progress ? (
            <p className="text-sm text-muted-foreground">
              Scanning batch {progress.current} of {progress.total}…
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Starting full universe scan…</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base">15m Intraday Futures Engine</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Scans all futures pairs on load · Live signals need ≥{FUTURES_INTRADAY_MIN_CONFIDENCE}%
                conf · Universe % is a weighted score (penalized when filters fail)
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="default"
                className="gap-2"
                onClick={rescan}
                disabled={isScanning || !markets?.length}
              >
                <RefreshCw className={`h-4 w-4 ${isScanning ? "animate-spin" : ""}`} />
                {isScanning ? "Scanning…" : "Scan all again"}
              </Button>
              {scanned > 0 ? (
                <span className="text-xs text-muted-foreground">
                  {scanned} coins · {signals.length} signal{signals.length === 1 ? "" : "s"}
                  {lastScanAt ? ` · ${new Date(lastScanAt).toLocaleTimeString()}` : ""}
                </span>
              ) : null}
            </div>
          </div>
          {isScanning && progress ? (
            <p className="text-xs text-primary">
              Batch {progress.current}/{progress.total}…
            </p>
          ) : null}
          {error ? <p className="text-xs text-bear">{error}</p> : null}
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <h3 className="px-4 pt-2 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Enter now ({signals.length})
          </h3>
          {signals.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-muted-foreground">
              No enter-now setups — price must be in the entry zone with 5m confirmation. See
              &quot;Wait price&quot; rows below.
            </p>
          ) : (
            <table className="w-full text-xs mb-4">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-left">
                  <th className="p-3 font-medium">Symbol</th>
                  <th className="p-3 font-medium">Dir</th>
                  <th className="p-3 font-medium">Entry</th>
                  <th className="p-3 font-medium">SL</th>
                  <th className="p-3 font-medium">TP1</th>
                  <th className="p-3 font-medium">TP2</th>
                  <th className="p-3 font-medium">TP3</th>
                  <th className="p-3 font-medium">R:R</th>
                  <th className="p-3 font-medium">Conf%</th>
                  <th className="p-3 font-medium">Grade</th>
                  <th className="p-3 font-medium">Hold</th>
                </tr>
              </thead>
              <tbody>
                {signals.map((s) => (
                  <tr
                    key={s.id}
                    className={`border-b border-border/60 cursor-pointer hover:bg-muted/40 ${
                      selected?.id === s.id ? "bg-muted/50" : ""
                    }`}
                    onClick={() => setSelected(s)}
                  >
                    <td className="p-3 font-medium">{s.pairLabel}</td>
                    <td className="p-3">
                      <DirectionBadge direction={s.direction} />
                    </td>
                    <td className="p-3 font-mono">{formatUsd(s.entry)}</td>
                    <td className="p-3 font-mono text-muted-foreground">{formatUsd(s.stopLoss)}</td>
                    <td className="p-3 font-mono">{formatUsd(s.tp1)}</td>
                    <td className="p-3 font-mono">{formatUsd(s.tp2)}</td>
                    <td className="p-3 font-mono">{formatUsd(s.tp3)}</td>
                    <td className="p-3 font-mono">{s.riskReward.toFixed(1)}</td>
                    <td className="p-3 font-mono">{s.confidence}%</td>
                    <td className="p-3">
                      <Badge variant={gradeVariant(s.setupGrade)}>{s.setupGrade}</Badge>
                    </td>
                    <td className="p-3">{s.holdingMinutes}m</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Universe scan ({assessments.length} coins)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Every futures pair evaluated — grade reflects confidence + breakout (whichever is lower)
          </p>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto max-h-[420px] overflow-y-auto">
          {assessments.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No scan results yet.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-background z-10">
                <tr className="border-b border-border text-muted-foreground text-left">
                  <th className="p-3 font-medium">Symbol</th>
                  <th className="p-3 font-medium">15m</th>
                  <th className="p-3 font-medium">Bias</th>
                  <th className="p-3 font-medium">Conf%</th>
                  <th
                    className="p-3 font-medium"
                    title="Overall grade — capped by confidence (not breakout alone)"
                  >
                    Grade
                  </th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((a) => {
                  const signal = signalBySymbol.get(a.symbol);
                  return (
                    <tr
                      key={a.symbol}
                      className={`border-b border-border/60 ${
                        signal ? "cursor-pointer hover:bg-muted/40" : ""
                      } ${selected?.symbol === a.symbol ? "bg-muted/50" : ""}`}
                      onClick={() => signal && setSelected(signal)}
                    >
                      <td className="p-3 font-medium">{a.pairLabel}</td>
                      <td className="p-3">{a.trend15m ?? "—"}</td>
                      <td className="p-3">
                        {a.direction ? <DirectionBadge direction={a.direction} /> : "—"}
                      </td>
                      <td className="p-3 font-mono">{a.confidence > 0 ? `${a.confidence}%` : "—"}</td>
                      <td className="p-3">
                        {a.setupGrade ? (
                          <Badge variant={gradeVariant(a.setupGrade)}>{a.setupGrade}</Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            a.status === "signal"
                              ? "bull"
                              : a.status === "watch"
                                ? "warning"
                                : a.status === "no_data"
                                  ? "warning"
                                  : "outline"
                          }
                        >
                          {statusLabel(a)}
                        </Badge>
                      </td>
                      <td className="p-3 text-muted-foreground max-w-[200px] truncate">
                        {a.rejectReason ?? (a.status === "signal" ? "Trade eligible" : "")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {selected ? <FuturesMtfDetailPanel signal={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}
