"use client";

import Link from "next/link";
import { useMarkets } from "@/hooks/use-markets";
import { useBatchCoinGrades } from "@/hooks/use-batch-signals";
import { useCryptoSettingsStore } from "@/stores/crypto-settings-store";
import { QualityBadge } from "@/components/signals/quality-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatPairLabel } from "@/config/market";
import type { CoinGrade, CoinMarket } from "@/types";
import { formatCompact, formatPercent } from "@/lib/utils";

export default function TrendingPage() {
  const tf = useCryptoSettingsStore((s) => s.defaultTimeframe);
  const { data: markets } = useMarkets();
  const { data: grades } = useBatchCoinGrades(markets, "spot", tf, 50);
  const gainers = [...(markets ?? [])].sort((a, b) => b.change24h - a.change24h).slice(0, 15);
  const losers = [...(markets ?? [])].sort((a, b) => a.change24h - b.change24h).slice(0, 15);
  const volume = [...(markets ?? [])].sort((a, b) => b.volume24h - a.volume24h).slice(0, 10);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Trending Coins</h1>
        <p className="text-sm text-muted-foreground">Gainers · Losers · Volume leaders</p>
      </header>
      <section className="grid lg:grid-cols-3 gap-6">
        <TrendList title="Top Gainers" coins={gainers} grades={grades} />
        <TrendList title="Top Losers" coins={losers} grades={grades} negative />
        <TrendList title="Volume Leaders" coins={volume} grades={grades} showVolume />
      </section>
    </section>
  );
}

function TrendList({
  title,
  coins,
  grades,
  negative,
  showVolume,
}: {
  title: string;
  coins: CoinMarket[];
  grades?: Record<string, CoinGrade>;
  negative?: boolean;
  showVolume?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <h2 className="font-semibold mb-3">{title}</h2>
        <ul className="space-y-2 text-sm">
          {coins.map((coin, i) => (
            <li key={coin.id} className="flex justify-between items-center">
              <Link href={`/coin/${coin.id}?symbol=${coin.symbol}`} className="hover:text-primary flex items-center gap-2">
                <span className="text-muted-foreground">{i + 1}.</span>
                {formatPairLabel(coin.symbol)}
                <QualityBadge quality={grades?.[coin.symbol]?.quality} compact />
              </Link>
              <span className={negative ? "text-bear" : "text-bull"}>
                {showVolume ? formatCompact(coin.volume24h) : formatPercent(coin.change24h)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
