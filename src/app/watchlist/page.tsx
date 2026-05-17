"use client";

import Link from "next/link";
import { useWatchlistStore } from "@/stores/watchlist-store";
import { useMarkets } from "@/hooks/use-markets";
import { useBatchCoinGrades } from "@/hooks/use-batch-signals";
import { useCryptoSettingsStore } from "@/stores/crypto-settings-store";
import { QualityBadge } from "@/components/signals/quality-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPairLabel } from "@/config/market";
import { formatPercent, formatUsd } from "@/lib/utils";

export default function WatchlistPage() {
  const tf = useCryptoSettingsStore((s) => s.defaultTimeframe);
  const { items, remove } = useWatchlistStore();
  const { data: markets } = useMarkets();
  const watchMarkets =
    markets?.filter((m) => items.some((i) => i.symbol === m.symbol)) ?? [];
  const { data: grades } = useBatchCoinGrades(
    watchMarkets.length ? watchMarkets : undefined,
    "spot",
    tf,
    Math.max(watchMarkets.length, 1)
  );

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Watchlist</h1>
        <p className="text-sm text-muted-foreground">Track assets and price alerts</p>
      </header>
      {items.length === 0 ? (
        <p className="text-muted-foreground">No coins in watchlist. Add from coin detail pages.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const coin = markets?.find((m) => m.symbol === item.symbol);
            return (
              <li key={item.symbol}>
                <Card>
                  <CardContent className="p-4 flex items-center justify-between">
                    <Link href={`/coin/${item.coinId}?symbol=${item.symbol}`} className="font-semibold hover:text-primary flex items-center gap-2">
                      {formatPairLabel(item.symbol)}
                      <QualityBadge quality={grades?.[item.symbol]?.quality} compact />
                      {coin && <span className="text-muted-foreground font-normal ml-2">{formatUsd(coin.price)} <span className={coin.change24h >= 0 ? "text-bull" : "text-bear"}>{formatPercent(coin.change24h)}</span></span>}
                    </Link>
                    <Button variant="ghost" size="sm" onClick={() => remove(item.symbol)}>Remove</Button>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
