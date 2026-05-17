"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Compass,
  Gauge,
  Info,
  Shield,
  TrendingUp,
  XOctagon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HIGHER_TIMEFRAME, resolveChartTrendFromCandles } from "@/engines/crypto-timing-engine";
import { computeIndicators } from "@/engines/indicators";
import { formatPairLabel, formatIndiaPairLabel } from "@/config/market";
import { QualityBadge } from "@/components/signals/quality-badge";
import { EntryTimingBanner } from "@/components/signals/entry-timing-banner";
import { TrendBanner } from "@/components/signals/trend-banner";
import { TradingStyleBanner } from "@/components/signals/trading-style-banner";
import { FieldLabel, InfoLabel } from "@/components/ui/info-label";
import { SIGNAL_TERM_HELP } from "@/config/signal-help";
import { cn, formatUsd, formatInr } from "@/lib/utils";
import type {
  Candle,
  ConfidenceBand,
  ExecutionMode,
  TradeQuality,
  TradeWarning,
  TradingSignal,
} from "@/types";

function formatMoney(signal: TradingSignal, value: number) {
  return signal.currency === "INR" ? formatInr(value) : formatUsd(value);
}

const TRADE_QUALITY_STYLES: Record<
  TradeQuality,
  { label: string; tone: string; bg: string; border: string; description: string }
> = {
  "A+": {
    label: "A+ · Exceptional",
    tone: "text-bull",
    bg: "bg-bull/15",
    border: "border-bull/40",
    description: "Multi-timeframe aligned, momentum & structure — execute with discipline.",
  },
  A: {
    label: "A · High Probability",
    tone: "text-bull",
    bg: "bg-bull/10",
    border: "border-bull/30",
    description: "High probability setup with broad trend support.",
  },
  B: {
    label: "B · Decent Intraday",
    tone: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/30",
    description: "Reasonable intraday setup — manage size carefully.",
  },
  C: {
    label: "C · Weak / Risky",
    tone: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/30",
    description: "Setup forming but unconfirmed — wait for confirmation.",
  },
  D: {
    label: "D · Avoid",
    tone: "text-bear",
    bg: "bg-bear/10",
    border: "border-bear/40",
    description: "Fails minimum quality checks — do not trade.",
  },
};

const CONFIDENCE_BAND_STYLE: Record<ConfidenceBand, string> = {
  "Very High": "text-bull",
  High: "text-primary",
  Medium: "text-warning",
  Weak: "text-bear",
};

const EXECUTION_MODE_LABEL: Record<ExecutionMode, string> = {
  aggressive: "Aggressive Entry",
  conservative: "Conservative Entry",
  wait_confirmation: "Wait for Confirmation",
  wait_retest: "Wait for Retest",
  avoid_chase: "Do Not Chase",
  capital_preservation: "Capital Preservation Mode",
  scale_in: "Scale-In Entry",
};

const EXECUTION_MODE_TONE: Record<ExecutionMode, string> = {
  aggressive: "text-bull border-bull/40 bg-bull/10",
  conservative: "text-primary border-primary/40 bg-primary/10",
  wait_confirmation: "text-warning border-warning/40 bg-warning/10",
  wait_retest: "text-warning border-warning/40 bg-warning/10",
  avoid_chase: "text-bear border-bear/40 bg-bear/10",
  capital_preservation: "text-bear border-bear/50 bg-bear/15",
  scale_in: "text-primary border-primary/40 bg-primary/10",
};

const SEVERITY_TONE: Record<TradeWarning["severity"], string> = {
  info: "text-muted-foreground",
  caution: "text-warning",
  high: "text-bear",
};

export function SignalCard({
  signal,
  chartCandles,
}: {
  signal: TradingSignal;
  /** Same candles as the price chart — keeps the trend pill in sync with what you see. */
  chartCandles?: Candle[];
}) {
  const isIndia = signal.currency === "INR" || signal.market.startsWith("india");
  const pairLabel =
    signal.pairLabel ??
    (isIndia ? formatIndiaPairLabel(signal.symbol) : formatPairLabel(signal.symbol));
  const href = isIndia
    ? `/india/stock/${signal.symbol}`
    : `/coin/${signal.coinId}?symbol=${signal.symbol}`;

  const isBull = signal.action.includes("BUY") || signal.action.includes("LONG");
  const isBear = signal.action.includes("SHORT") || signal.action.includes("SELL");
  const variant = isBull ? "bull" : isBear ? "bear" : "secondary";

  const reasons = isBull ? signal.whyBuy : signal.whySell;
  const isCrypto = signal.market === "spot" || signal.market === "futures";
  const higherTf = isCrypto ? HIGHER_TIMEFRAME[signal.bestTimeframe] : undefined;

  const liveTrend = useMemo(() => {
    if (!isCrypto || !chartCandles?.length || !higherTf || !signal.higherTfTrend) return null;
    return resolveChartTrendFromCandles({
      candles: chartCandles,
      timeframe: signal.bestTimeframe,
      higherTf,
      higherTfTrend: signal.higherTfTrend,
      indicators: computeIndicators(chartCandles),
    });
  }, [chartCandles, higherTf, isCrypto, signal.bestTimeframe, signal.higherTfTrend]);

  const chartTrend = liveTrend?.chartTrend ?? signal.chartTrend;
  const overallTrend = liveTrend?.overallTrend ?? signal.overallTrend;
  const trendDetail = liveTrend?.trendDetail ?? signal.trendDetail;
  const trendSummary = liveTrend?.trendSummary ?? signal.trendSummary;

  const tradeQuality: TradeQuality = signal.tradeQuality ?? (signal.quality === "A" ? "A" : signal.quality === "B" ? "B" : "C");
  const tqStyle = TRADE_QUALITY_STYLES[tradeQuality];
  const band = signal.confidenceBand;
  const isNoTrade =
    signal.capitalPreservationMode === true ||
    tradeQuality === "D" ||
    signal.action === "WAIT" ||
    signal.action === "HOLD";

  const structuredWarnings = signal.structuredWarnings ?? [];
  const highWarnings = structuredWarnings.filter((w) => w.severity === "high");
  const cautionWarnings = structuredWarnings.filter((w) => w.severity === "caution");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="hover:border-primary/30 transition-colors">
        <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
          <div>
            <CardTitle className="text-base">
              <Link href={href} className="hover:text-primary">
                {pairLabel}
              </Link>
            </CardTitle>
            {signal.currentPrice !== undefined && (
              <p className="text-xs font-mono text-muted-foreground mt-0.5">
                LTP {formatMoney(signal, signal.currentPrice)}
              </p>
            )}
            {signal.refreshNote && (
              <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{signal.refreshNote}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={variant}>
              {signal.suggestWaitForPrice && signal.action !== "WAIT" && signal.action !== "HOLD"
                ? "WAIT FOR PRICE"
                : signal.action}
            </Badge>
            {signal.suggestWaitForPrice &&
              signal.action !== "WAIT" &&
              signal.action !== "HOLD" && (
                <span className="text-[10px] text-warning font-medium">{signal.action}</span>
              )}
            <span
              className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded border",
                tqStyle.bg,
                tqStyle.border,
                tqStyle.tone
              )}
              title={SIGNAL_TERM_HELP.qualityGrade.plain}
            >
              {tqStyle.label}
            </span>
            <QualityBadge quality={signal.quality ?? "C"} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {/* No-trade banner */}
          {isNoTrade && (
            <div
              className={cn(
                "rounded-lg border p-3 text-xs flex items-start gap-2",
                signal.capitalPreservationMode
                  ? "border-bear/40 bg-bear/10 text-bear"
                  : "border-warning/40 bg-warning/10 text-warning"
              )}
            >
              {signal.capitalPreservationMode ? (
                <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
              ) : (
                <XOctagon className="h-4 w-4 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <p className="font-semibold">
                  {signal.capitalPreservationMode ? "Capital Preservation Mode" : "No Trade"}
                </p>
                <p className="text-foreground/80 mt-0.5">
                  {signal.executionPlan ??
                    "Setup quality is insufficient. Wait for a cleaner opportunity."}
                </p>
              </div>
            </div>
          )}

          {/* Trend block */}
          {isCrypto && overallTrend && (
            <TrendBanner
              chartTrend={chartTrend}
              higherTfTrend={signal.higherTfTrend}
              overallTrend={overallTrend}
              trendDetail={trendDetail}
              trendSummary={trendSummary}
              timeframe={signal.bestTimeframe}
              higherTf={higherTf}
            />
          )}

          {signal.tradingStyle && signal.tradingStyle.primaryScore >= 35 && (
            <TradingStyleBanner analysis={signal.tradingStyle} />
          )}

          {/* Execution recommendation */}
          {signal.executionMode && !isNoTrade && (
            <div
              className={cn(
                "rounded-md border p-2 text-xs flex items-start gap-2",
                EXECUTION_MODE_TONE[signal.executionMode]
              )}
            >
              <Compass className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold flex items-center gap-1 flex-wrap">
                  {EXECUTION_MODE_LABEL[signal.executionMode]}
                  <InfoLabel entry={SIGNAL_TERM_HELP.executionMode} showLabel={false} />
                </p>
                {signal.executionPlan && (
                  <p className="text-foreground/80 mt-0.5 leading-snug">{signal.executionPlan}</p>
                )}
              </div>
            </div>
          )}

          {(isCrypto || signal.entryTimingNote) && <EntryTimingBanner signal={signal} />}

          {/* Confidence + win prob + R:R + band */}
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div>
              <FieldLabel entry={SIGNAL_TERM_HELP.confidence} />
              <span className="font-mono font-semibold">{signal.confidence}%</span>
              {band && (
                <span className={cn("block text-[10px] font-semibold", CONFIDENCE_BAND_STYLE[band])}>
                  {band}
                </span>
              )}
            </div>
            <div>
              <FieldLabel entry={SIGNAL_TERM_HELP.winProbability} />
              <span className="font-mono">{signal.winProbability ?? "—"}%</span>
            </div>
            <div>
              <FieldLabel entry={SIGNAL_TERM_HELP.riskReward} />
              <span
                className={cn(
                  "font-mono",
                  signal.riskReward >= 2 ? "text-bull" : signal.riskReward >= 1.5 ? "text-primary" : "text-warning"
                )}
              >
                {signal.riskReward}x
              </span>
            </div>
            <div>
              <FieldLabel entry={SIGNAL_TERM_HELP.riskScore} />
              <span
                className={cn(
                  "font-mono",
                  signal.riskScore > 65 ? "text-bear" : signal.riskScore > 45 ? "text-warning" : "text-bull"
                )}
              >
                {signal.riskScore}/100
              </span>
            </div>
          </div>

          {/* Confidence bar */}
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full transition-all",
                tradeQuality === "A+" || tradeQuality === "A"
                  ? "bg-bull"
                  : tradeQuality === "B"
                    ? "bg-primary"
                    : tradeQuality === "C"
                      ? "bg-warning"
                      : "bg-bear"
              )}
              style={{ width: `${signal.confidence}%` }}
            />
          </div>

          {/* Trend alignment */}
          {signal.trendAlignment && (
            <div className="rounded-md border border-border/40 p-2 text-[11px] flex items-center justify-between bg-muted/20">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" />
                <FieldLabel entry={SIGNAL_TERM_HELP.trendAlignment} className="[&_button]:align-middle" />
              </div>
              <div className="flex items-center gap-1 font-mono">
                <span className="text-foreground">
                  {signal.trendAlignment.agreementCount}/3 TFs
                </span>
                <span className="text-muted-foreground">·</span>
                <span
                  className={cn(
                    signal.trendAlignment.alignmentScore >= 75
                      ? "text-bull"
                      : signal.trendAlignment.alignmentScore >= 50
                        ? "text-primary"
                        : "text-warning"
                  )}
                >
                  {signal.trendAlignment.alignmentScore}/100
                </span>
              </div>
            </div>
          )}

          {/* Levels */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <FieldLabel entry={SIGNAL_TERM_HELP.entryZone} />
              <span className="font-mono">
                {formatMoney(signal, signal.entryZone[0])} – {formatMoney(signal, signal.entryZone[1])}
              </span>
            </div>
            <div>
              <FieldLabel entry={SIGNAL_TERM_HELP.trailingStop} />
              <span className="font-mono text-muted-foreground">{formatMoney(signal, signal.trailingStop)}</span>
            </div>
            <div>
              <FieldLabel entry={SIGNAL_TERM_HELP.stopLoss} />
              <span className="font-mono text-bear">{formatMoney(signal, signal.stopLoss)}</span>
            </div>
            <div>
              <FieldLabel entry={SIGNAL_TERM_HELP.takeProfit} />
              <span className="font-mono text-bull">{formatMoney(signal, signal.takeProfit)}</span>
              {signal.takeProfit2 && (
                <span className="block text-[10px] text-muted-foreground font-mono">
                  TP2 {formatMoney(signal, signal.takeProfit2)}
                </span>
              )}
            </div>
          </div>

          {/* Size + hold + window */}
          <div className="rounded-md bg-muted/40 p-2 text-xs space-y-1">
            <p className="text-muted-foreground flex flex-wrap items-start gap-x-1 gap-y-1">
              <InfoLabel entry={SIGNAL_TERM_HELP.hold} labelClassName="text-foreground font-medium" />
              <span>{signal.durationEstimate}</span>
            </p>
            <p className="text-muted-foreground">
              <span className="text-foreground font-medium">Size:</span>{" "}
              {signal.suggestedLeverage}
              {signal.capitalRiskPercent !== undefined && (
                <>
                  {" "}
                  ·{" "}
                  <span title={SIGNAL_TERM_HELP.capitalRisk.plain}>
                    risk ~{signal.capitalRiskPercent}% of portfolio
                  </span>
                </>
              )}
            </p>
            {signal.idealEntryWindow && (
              <p className="text-muted-foreground">
                <span className="text-foreground font-medium">Best window:</span>{" "}
                {signal.idealEntryWindow}
              </p>
            )}
          </div>

          {/* Why buy/sell — confirmations */}
          {reasons && reasons.length > 0 && (
            <div className="rounded-md border border-bull/20 bg-bull/5 p-2 text-xs space-y-1">
              <p className="font-medium text-bull flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Why {isBull ? "buy" : "sell"}
              </p>
              <ul className="text-muted-foreground space-y-0.5">
                {reasons.slice(0, 4).map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* High-severity warnings shown inline */}
          {highWarnings.length > 0 && (
            <div className="rounded-md border border-bear/30 bg-bear/5 p-2 text-xs space-y-1">
              <p className="font-medium text-bear flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                High-priority warnings
              </p>
              <ul className="text-muted-foreground space-y-0.5">
                {highWarnings.slice(0, 4).map((w) => (
                  <li key={w.message} className={SEVERITY_TONE[w.severity]}>
                    ⚠ {w.message}
                    {w.penalty ? (
                      <span className="text-[10px] text-muted-foreground"> (−{w.penalty} confidence)</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Invalidation */}
          {signal.invalidation && signal.invalidation.length > 0 && (
            <div className="rounded-md border border-border/40 bg-muted/30 p-2 text-xs space-y-1">
              <p className="font-medium flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5" />
                Exit if
              </p>
              <ul className="text-muted-foreground space-y-0.5">
                {signal.invalidation.slice(0, 3).map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* AI Commentary */}
          {signal.aiCommentary && (
            <div className="rounded-md border border-primary/20 bg-primary/5 p-2 text-xs space-y-1">
              <p className="font-medium text-primary flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" />
                AI commentary
              </p>
              <p className="text-muted-foreground leading-relaxed">{signal.aiCommentary}</p>
            </div>
          )}

          {/* Caution warnings (collapsed) */}
          {cautionWarnings.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-warning">
                Caution notes ({cautionWarnings.length})
              </summary>
              <ul className="text-warning space-y-0.5 mt-1">
                {cautionWarnings.map((w) => (
                  <li key={w.message}>
                    ⚠ {w.message}
                    {w.penalty ? (
                      <span className="text-[10px] text-muted-foreground"> (−{w.penalty})</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {/* Confirmations list (collapsed) */}
          {signal.confirmations.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                All confirmations ({signal.confirmations.length})
              </summary>
              <ul className="text-muted-foreground space-y-0.5 mt-1">
                {signal.confirmations.slice(0, 8).map((c) => (
                  <li key={c}>✓ {c}</li>
                ))}
              </ul>
            </details>
          )}

          {/* Win prob breakdown */}
          {signal.winProbabilityBreakdown && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Score breakdown
              </summary>
              <div className="mt-1 space-y-1 font-mono text-[11px]">
                {Object.entries(signal.winProbabilityBreakdown).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2">
                    <span className="w-28 text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full",
                          v >= 70 ? "bg-bull" : v >= 50 ? "bg-primary" : "bg-warning"
                        )}
                        style={{ width: `${v}%` }}
                      />
                    </div>
                    <span className="w-8 text-right">{Math.round(v)}</span>
                  </div>
                ))}
              </div>
            </details>
          )}

          {tqStyle.description && !isNoTrade && (
            <p className="text-[10px] text-muted-foreground italic">{tqStyle.description}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
