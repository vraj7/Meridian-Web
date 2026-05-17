"use client";

import { Card, CardContent } from "@/components/ui/card";

/** How to use rotating signals without over-trading. */
export function TradingWorkflowCard() {
  return (
    <Card className="border-border/60 bg-muted/10">
      <CardContent className="p-4 text-xs text-muted-foreground space-y-2">
        <p className="text-sm font-semibold text-foreground">How to trade with this terminal</p>
        <ol className="list-decimal pl-4 space-y-1.5">
          <li>
            <strong className="text-foreground">Pick one coin</strong> you already watch (e.g. BTC or ETH).
            Open its detail page — do not chase whichever card is on top of the list.
          </li>
          <li>
            Trade only when you see <strong className="text-foreground">Grade A</strong>, overall trend aligned,
            and the same action for ~15 minutes (stability note on the card).
          </li>
          <li>
            Check <strong className="text-foreground">Wait for price</strong> on the card — if price is
            outside the entry zone, use the target level (limit order) instead of market buying/selling.
          </li>
          <li>
            Use <strong className="text-foreground">entry zone, stop loss, and TP</strong>. If price hits
            invalidation, exit — do not wait for the next refresh.
          </li>
          <li>
            The list re-scans every few minutes; a new &quot;STRONG SHORT&quot; on another coin is a{" "}
            <em>scanner hit</em>, not an automatic switch. Your plan stays on the symbol you chose.
          </li>
        </ol>
        <p className="text-[11px] border-t border-border/40 pt-2">
          This is analysis support, not auto-trading. Raise min confidence in Settings and turn off Demo mode for live data.
        </p>
      </CardContent>
    </Card>
  );
}
