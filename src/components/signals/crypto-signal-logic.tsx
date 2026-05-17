"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { TradingStylesGuide } from "@/components/signals/trading-styles-guide";
import { InfoLabel } from "@/components/ui/info-label";
import { SIGNAL_TERM_HELP } from "@/config/signal-help";
import { cn } from "@/lib/utils";

export function CryptoSignalLogic() {
  const [open, setOpen] = useState(false);

  return (
    <Card className="border-border/60 bg-muted/10">
      <CardContent className="p-4">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between text-left"
        >
          <div>
            <p className="text-sm font-semibold">How buy / sell signals are decided</p>
            <p className="text-xs text-muted-foreground">
              Click to understand quality grades, timing, and what each label means
            </p>
          </div>
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </button>

        {open && (
          <div className="mt-4 space-y-4 text-xs text-muted-foreground">
            <section>
              <p className="font-medium text-foreground mb-1">1. Multi-confirmation scoring</p>
              <p>
                Every coin is scored bullish vs bearish using 10+ checks: RSI, MACD, EMA stack
                (9/21/50), Bollinger Bands, VWAP, Stoch RSI, ADX trend strength, volume spike,
                range position, candlestick patterns, market sentiment (Fear &amp; Greed +
                news), and (for futures) funding rate &amp; long/short ratio.
              </p>
            </section>

            <section>
              <p className="font-medium text-foreground mb-1">2. Overall trend (uptrend / downtrend / sideways)</p>
              <p>
                Each card shows <strong>Overall trend</strong> plus your chart timeframe and a higher
                timeframe (e.g. 1h + 1D). When both say <strong>Uptrend</strong>, buys align with the
                market. When both say <strong>Downtrend</strong>, sells/shorts align. If they disagree,
                the app marks <strong>Sideways</strong> and warns you to wait.
              </p>
            </section>

            <section>
              <p className="font-medium text-foreground mb-1">3. Higher-timeframe filter</p>
              <p>
                Your selected timeframe is checked against a higher one (e.g. 1h ↔ 1D). Trades
                that go <em>with</em> the bigger trend get a confidence boost; counter-trend
                trades are penalized to avoid fakeouts.
              </p>
            </section>

            <section>
              <p className="font-medium text-foreground mb-1">4. Regime detection</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li><strong className="text-bull">Strong uptrend</strong> — buy pullbacks to EMA21</li>
                <li><strong className="text-bear">Strong downtrend</strong> — sell rallies to EMA21</li>
                <li><strong>Pullback in trend</strong> — best risk/reward zone to enter</li>
                <li><strong>Breakout / breakdown</strong> — must be confirmed by volume</li>
                <li><strong>Ranging</strong> — small size, scalp only, no breakout chases</li>
                <li><strong>High volatility</strong> — wider stops, less leverage</li>
              </ul>
            </section>

            <section>
              <p className="font-medium text-foreground mb-2">5. Trading style (auto-detected)</p>
              <p className="mb-3">
                Each setup is scored against nine styles. Tap the{" "}
                <span className="inline-flex align-middle rounded-full bg-muted px-1">
                  <span className="sr-only">info</span>ⓘ
                </span>{" "}
                icon next to any name for a plain-English explanation.
              </p>
              <TradingStylesGuide />
            </section>

            <section>
              <div className="mb-2">
                <InfoLabel entry={SIGNAL_TERM_HELP.qualityGrade} labelClassName="font-medium text-foreground" />
              </div>
              <p>
                Prefer <strong className="text-bull">A or A+</strong>; treat{" "}
                <strong className="text-warning">C or D</strong> as wait or skip.
              </p>
            </section>

            <section className="space-y-2">
              <p className="font-medium text-foreground">7. Stop loss &amp; take profit</p>
              <InfoLabel entry={SIGNAL_TERM_HELP.atr} labelClassName="text-foreground font-medium" />
              <InfoLabel entry={SIGNAL_TERM_HELP.stopLoss} />
              <InfoLabel entry={SIGNAL_TERM_HELP.takeProfit} />
              <InfoLabel entry={SIGNAL_TERM_HELP.riskReward} />
            </section>

            <section>
              <p className="font-medium text-foreground mb-1">8. Best entry window (UTC)</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li><strong>13:00–17:00 UTC</strong> — US/EU overlap, highest liquidity (best for breakouts)</li>
                <li><strong>07:00–09:00 UTC</strong> — EU open, good for directional moves</li>
                <li><strong>01:00–07:00 UTC</strong> — Asia session, often range-bound</li>
                <li><strong>21:00–01:00 UTC</strong> — thin liquidity, fakeouts more common</li>
              </ul>
            </section>

            <section>
              <p className="font-medium text-foreground mb-1">9. Wait for price (entry zone)</p>
              <p>
                <strong>BUY NOW</strong> means the setup is bullish, but you should only enter when price is
                inside the <strong>entry zone</strong>. If price is too high (for buys) or too low (for sells),
                the card shows <strong>WAIT FOR PRICE</strong> with a target level — use a limit order there.
                Live LTP updates the banner until price reaches the zone.
              </p>
            </section>

            <section>
              <div className="mb-2">
                <InfoLabel entry={SIGNAL_TERM_HELP.signalStability} labelClassName="font-medium text-foreground" />
              </div>
              <p>
                The scanner refreshes every few minutes. Stability keeps the same buy/sell label for
                about 15 minutes unless the story changes clearly. Use one coin’s detail page for your
                actual trade plan.
              </p>
            </section>

            <section>
              <p className="font-medium text-foreground mb-1">11. Action labels</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li><strong className="text-bull">BUY NOW / STRONG LONG</strong> — bullish setup; enter in zone or at wait price</li>
                <li><strong className="text-warning">WAIT FOR PRICE</strong> — bias is right but price not in entry zone yet</li>
                <li><strong className="text-bear">SELL NOW / STRONG SHORT</strong> — bearish setup; enter in zone or at wait price</li>
                <li><strong>HOLD</strong> — already in trade, do not add</li>
                <li><strong>WAIT</strong> — conditions exist but timing/quality not ideal</li>
              </ul>
            </section>

            <p className="text-[11px] border-t border-border/40 pt-2">
              Probabilistic model — never guaranteed. Always confirm on your exchange chart and
              size positions so any single loss is &lt; 1–2% of capital.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
