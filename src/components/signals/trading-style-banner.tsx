"use client";

import { Layers } from "lucide-react";
import { SIGNAL_TERM_HELP, TRADING_STYLE_HELP } from "@/config/signal-help";
import { InfoLabel } from "@/components/ui/info-label";
import { TradingStylesGuide } from "@/components/signals/trading-styles-guide";
import { cn } from "@/lib/utils";
import type { TradingStyle, TradingStyleAnalysis } from "@/types";

const STYLE_TONE: Record<TradingStyle, string> = {
  scalping: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  intraday: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  swing: "border-indigo-500/30 bg-indigo-500/10 text-indigo-300",
  trend: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  breakout: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  reversal: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  range: "border-slate-500/30 bg-slate-500/10 text-slate-300",
  momentum: "border-orange-500/30 bg-orange-500/10 text-orange-300",
  mean_reversion: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
};

export function TradingStyleBanner({ analysis }: { analysis: TradingStyleAnalysis }) {
  const primaryTone = STYLE_TONE[analysis.primary];
  const primaryHelp = TRADING_STYLE_HELP[analysis.primary];
  const topReasons = analysis.scores.find((s) => s.style === analysis.primary)?.reasons ?? [];

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2 text-xs">
      <div className="flex items-start gap-2">
        <Layers className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
        <div className="min-w-0 flex-1 space-y-2">
          <InfoLabel
            entry={SIGNAL_TERM_HELP.tradingStyle}
            labelClassName="text-[10px] uppercase tracking-wider font-medium"
          />

          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
                primaryTone
              )}
            >
              {analysis.primaryLabel}
              <span className="ml-1 opacity-70" title="How well the chart matches this style">
                {analysis.primaryScore}% match
              </span>
            </span>
            {analysis.secondary && analysis.secondaryLabel ? (
              <span
                className="inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground"
                title={TRADING_STYLE_HELP[analysis.secondary]?.plain}
              >
                + {analysis.secondaryLabel}
              </span>
            ) : null}
          </div>

          <p className="text-foreground/90 leading-relaxed">{primaryHelp.plain}</p>
          {primaryHelp.detail ? (
            <p className="text-muted-foreground leading-relaxed">{primaryHelp.detail}</p>
          ) : null}

          <p className="text-muted-foreground">
            <span className="text-foreground/80 font-medium">Typical hold:</span> {analysis.suggestedHold}
          </p>

          {topReasons.length > 0 ? (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Why this style
              </p>
              <ul className="space-y-0.5 text-muted-foreground list-disc pl-4">
                {topReasons.slice(0, 3).map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <details className="group border-t border-border/40 pt-2">
            <summary className="cursor-pointer text-[11px] font-medium text-primary hover:underline list-none flex items-center gap-1">
              <span className="group-open:hidden">What do all 9 trading styles mean?</span>
              <span className="hidden group-open:inline">Hide style guide</span>
            </summary>
            <div className="mt-3">
              <TradingStylesGuide highlight={analysis.primary} compact />
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
