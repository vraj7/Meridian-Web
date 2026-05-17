"use client";

import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarketTrendLabel } from "@/types";

const TREND_STYLE: Record<
  MarketTrendLabel,
  { icon: typeof TrendingUp; tone: string; bg: string; border: string }
> = {
  Uptrend: {
    icon: TrendingUp,
    tone: "text-bull",
    bg: "bg-bull/10",
    border: "border-bull/30",
  },
  Downtrend: {
    icon: TrendingDown,
    tone: "text-bear",
    bg: "bg-bear/10",
    border: "border-bear/30",
  },
  Sideways: {
    icon: Minus,
    tone: "text-muted-foreground",
    bg: "bg-muted/30",
    border: "border-border/60",
  },
};

export function TrendPill({ trend, compact }: { trend: MarketTrendLabel; compact?: boolean }) {
  const s = TREND_STYLE[trend];
  const Icon = s.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border font-medium",
        s.bg,
        s.border,
        s.tone,
        compact ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1"
      )}
    >
      <Icon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {trend}
    </span>
  );
}

export function TrendBanner({
  chartTrend,
  higherTfTrend,
  overallTrend,
  trendSummary,
  trendDetail,
  timeframe,
  higherTf,
}: {
  chartTrend?: MarketTrendLabel;
  higherTfTrend?: MarketTrendLabel;
  overallTrend?: MarketTrendLabel;
  trendSummary?: string;
  trendDetail?: string;
  timeframe?: string;
  higherTf?: string;
}) {
  if (!overallTrend && !chartTrend) return null;

  const overall = overallTrend ?? chartTrend ?? "Sideways";
  const s = TREND_STYLE[overall];
  const Icon = s.icon;

  return (
    <div className={cn("rounded-lg border p-3 space-y-2", s.bg, s.border)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", s.tone)} />
          <span className={cn("text-sm font-semibold", s.tone)}>Overall trend: {overall}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {chartTrend && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              {timeframe ?? "Chart"}:
              <TrendPill trend={chartTrend} compact />
            </span>
          )}
          {higherTfTrend && higherTf && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              {higherTf}:
              <TrendPill trend={higherTfTrend} compact />
            </span>
          )}
        </div>
      </div>
      {trendDetail && <p className="text-xs text-muted-foreground leading-relaxed">{trendDetail}</p>}
      {trendSummary && !trendDetail && (
        <p className="text-[10px] text-muted-foreground">{trendSummary}</p>
      )}
    </div>
  );
}
