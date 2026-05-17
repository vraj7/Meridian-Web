"use client";

import { TRADING_STYLE_HELP, TRADING_STYLE_ORDER } from "@/config/signal-help";
import { InfoLabel } from "@/components/ui/info-label";
import type { TradingStyle } from "@/types";

export function TradingStylesGuide({
  highlight,
  compact = false,
}: {
  /** Highlight the detected primary style on cards. */
  highlight?: TradingStyle;
  compact?: boolean;
}) {
  return (
    <ul className={compact ? "space-y-2" : "space-y-3"}>
      {TRADING_STYLE_ORDER.map((style) => {
        const entry = TRADING_STYLE_HELP[style];
        const isHighlight = highlight === style;
        return (
          <li
            key={style}
            className={
              isHighlight
                ? "rounded-md border border-primary/30 bg-primary/5 px-2 py-1.5"
                : undefined
            }
          >
            <div className="flex items-start gap-1">
              <InfoLabel entry={entry} size={compact ? "sm" : "md"} labelClassName="font-medium text-foreground" />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
