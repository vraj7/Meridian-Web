"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function OptionsSignalLogic() {
  return (
    <Card className="border-border/60 bg-muted/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">How BUY / SELL signals are generated</CardTitle>
      </CardHeader>
      <CardContent className="text-xs text-muted-foreground space-y-3">
        <section>
          <p className="font-medium text-foreground mb-1">Inputs (NIFTY / BANKNIFTY / FINNIFTY)</p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>Spot LTP from option chain</li>
            <li>PCR = total put OI ÷ total call OI</li>
            <li>Max pain strike (OI-weighted)</li>
            <li>ATM / OTM strike CE & PE premiums (LTP)</li>
            <li>IV skew (call vs put at ATM)</li>
            <li>News mood (India + global sentiment)</li>
          </ul>
        </section>
        <section>
          <p className="font-medium text-foreground mb-1">Bias</p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>PCR &gt; 1.08 → bullish · PCR &lt; 0.92 → bearish</li>
            <li>Confidence = 52 + |PCR−1|×45 + news score (min threshold from Settings)</li>
          </ul>
        </section>
        <section>
          <p className="font-medium text-foreground mb-1">Actions</p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>
              <strong className="text-bull">BUY CALL</strong> — bullish bias, spot at/below max pain, confidence ≥
              threshold
            </li>
            <li>
              <strong className="text-bear">BUY PUT</strong> — bearish bias, spot at/above max pain
            </li>
            <li>
              <strong>SELL CALL</strong> — rich call IV / low PCR (capped upside)
            </li>
            <li>
              <strong>SELL PUT</strong> — high PCR / put writing (bullish positioning)
            </li>
          </ul>
        </section>
        <p className="text-[11px] border-t border-border/40 pt-2">
          Probabilistic model for education only. Premium LTP comes from NSE chain when available; otherwise estimated.
          Always verify live prices before trading.
        </p>
      </CardContent>
    </Card>
  );
}
