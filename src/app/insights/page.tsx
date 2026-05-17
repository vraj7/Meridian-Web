"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMarkets, useBtcDominance } from "@/hooks/use-markets";
import { useSentiment } from "@/hooks/use-sentiment";
import { useBatchSignals } from "@/hooks/use-batch-signals";
import { generateMarketCommentary } from "@/engines/prediction-engine";
import { useCryptoSettingsStore } from "@/stores/crypto-settings-store";

export default function InsightsPage() {
  const tf = useCryptoSettingsStore((s) => s.defaultTimeframe);
  const { data: markets } = useMarkets();
  const { data: dominance } = useBtcDominance();
  const { data: sentiment } = useSentiment();
  const { data: spot } = useBatchSignals(markets, "spot", tf, 15);
  const { data: futures } = useBatchSignals(markets, "futures", tf, 15);

  const commentary = generateMarketCommentary(
    markets?.find((m) => m.symbol === "BTC")?.change24h ?? 0,
    dominance ?? 54,
    sentiment?.fearGreed ?? 50,
    (spot?.length ?? 0) + (futures?.length ?? 0)
  );

  const bullishCount = [...(spot ?? []), ...(futures ?? [])].filter(
    (s) => s.action.includes("BUY") || s.action.includes("LONG")
  ).length;
  const bearishCount = [...(spot ?? []), ...(futures ?? [])].filter(
    (s) => s.action.includes("SELL") || s.action.includes("SHORT")
  ).length;

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">AI Insights</h1>
        <p className="text-sm text-muted-foreground">Probabilistic market analysis — not financial advice</p>
      </header>
      <Card>
        <CardHeader><CardTitle className="text-sm">Market Overview</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">{commentary}</CardContent>
      </Card>
      <section className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Bullish setups</p>
            <p className="text-2xl font-bold text-bull">{bullishCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Bearish setups</p>
            <p className="text-2xl font-bold text-bear">{bearishCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Avg Fear & Greed</p>
            <p className="text-2xl font-bold">{sentiment?.fearGreed ?? "—"}</p>
          </CardContent>
        </Card>
      </section>
      <Card>
        <CardHeader><CardTitle className="text-sm">Strategy Notes</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Signals require minimum 2 confirmations and configurable confidence threshold.</p>
          <p>• Scalping favors 1m–15m timeframes; swing trades favor 4h–1D.</p>
          <p>• Futures funding extremes may indicate squeeze risk — check Futures dashboard.</p>
          <p>• When no signals appear, the engine is in capital preservation mode.</p>
        </CardContent>
      </Card>
    </section>
  );
}
