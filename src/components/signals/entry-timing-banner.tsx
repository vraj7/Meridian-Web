"use client";

import { useMemo } from "react";
import { Target, CheckCircle2, Clock } from "lucide-react";
import { resolveEntryTiming } from "@/engines/entry-timing-engine";
import { useLivePrices } from "@/hooks/use-live-prices";
import { cn, formatUsd, formatInr } from "@/lib/utils";
import type { TradingSignal } from "@/types";

function formatMoney(signal: TradingSignal, value: number) {
  return signal.currency === "INR" ? formatInr(value) : formatUsd(value);
}

export function EntryTimingBanner({ signal }: { signal: TradingSignal }) {
  const isCrypto = signal.market === "spot" || signal.market === "futures";
  const live = useLivePrices(isCrypto ? [signal.symbol] : []);
  /**
   * Reject live ticks that disagree wildly with the signal's basis — protects
   * against wrong-pair websocket messages (e.g. a DOT tick from an unrelated
   * USD pair coming back at $1.27 while the signal is built around $7.60).
   */
  const livePrice = live[signal.symbol];
  const basis = signal.currentPrice;
  const useLive =
    livePrice !== undefined &&
    livePrice > 0 &&
    (!basis || basis <= 0 || Math.abs(livePrice - basis) / basis < 0.15);
  const price = useLive ? livePrice : basis;

  const timing = useMemo(() => {
    if (!price || price <= 0) {
      return {
        status: signal.entryTimingStatus ?? "not_applicable",
        waitForPrice: signal.waitForPrice,
        idealEntryPrice: signal.idealEntryPrice,
        entryTimingNote: signal.entryTimingNote ?? "Waiting for live price…",
        suggestWaitForPrice: signal.suggestWaitForPrice ?? false,
        distanceToEntryPct: signal.distanceToEntryPct ?? 0,
      };
    }
    const isBull = signal.action.includes("BUY") || signal.action.includes("LONG");
    return resolveEntryTiming({
      isBullish: isBull,
      currentPrice: price,
      entryZone: signal.entryZone,
      action: signal.action,
    });
  }, [price, signal]);

  if (timing.status === "not_applicable" && signal.action === "WAIT") {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs">
        <p className="font-medium text-muted-foreground flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" />
          Wait — setup not ready
        </p>
        <p className="text-muted-foreground mt-1 leading-relaxed">{timing.entryTimingNote}</p>
      </div>
    );
  }

  const inZone = timing.status === "in_zone";
  const waitPrice = timing.waitForPrice ?? timing.idealEntryPrice;

  return (
    <div
      className={cn(
        "rounded-lg border p-3 text-xs space-y-1.5",
        inZone
          ? "border-bull/40 bg-bull/10"
          : timing.suggestWaitForPrice
            ? "border-warning/40 bg-warning/10"
            : "border-border/60 bg-muted/20"
      )}
    >
      <p
        className={cn(
          "font-semibold flex items-center gap-1.5",
          inZone ? "text-bull" : timing.suggestWaitForPrice ? "text-warning" : "text-foreground"
        )}
      >
        {inZone ? (
          <CheckCircle2 className="h-3.5 w-3.5" />
        ) : (
          <Target className="h-3.5 w-3.5" />
        )}
        {inZone
          ? "In entry zone — OK to enter"
          : waitPrice
            ? `Wait for price · target ${formatMoney(signal, waitPrice)}`
            : "Wait for better entry price"}
      </p>

      {price !== undefined && price > 0 && (
        <p className="font-mono text-[11px] text-muted-foreground">
          LTP {formatMoney(signal, price)}
          {timing.distanceToEntryPct !== undefined && !inZone && (
            <span>
              {" "}
              · {timing.distanceToEntryPct > 0 ? "+" : ""}
              {timing.distanceToEntryPct}% vs ideal entry
            </span>
          )}
        </p>
      )}

      <p className="text-muted-foreground leading-relaxed">{timing.entryTimingNote}</p>

      {!inZone && waitPrice && (
        <p className="text-[10px] text-muted-foreground border-t border-border/40 pt-1.5">
          Zone: {formatMoney(signal, signal.entryZone[0])} – {formatMoney(signal, signal.entryZone[1])}
          {timing.idealEntryPrice && (
            <>
              {" "}
              · Ideal ~{formatMoney(signal, timing.idealEntryPrice)}
            </>
          )}
        </p>
      )}
    </div>
  );
}
