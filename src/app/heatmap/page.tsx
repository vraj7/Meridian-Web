"use client";

import Link from "next/link";
import { useMarkets } from "@/hooks/use-markets";
import { useBatchCoinGrades } from "@/hooks/use-batch-signals";
import { useCryptoSettingsStore } from "@/stores/crypto-settings-store";
import { QualityBadge } from "@/components/signals/quality-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPairLabel } from "@/config/market";
import { formatPercent } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function HeatmapPage() {
  const tf = useCryptoSettingsStore((s) => s.defaultTimeframe);
  const { data: markets, isLoading } = useMarkets();
  const { data: grades } = useBatchCoinGrades(markets, "spot", tf, 50);

  if (isLoading) return <Skeleton className="h-96" />;

  const maxAbs = Math.max(...(markets?.map((m) => Math.abs(m.change24h)) ?? [1]), 1);

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Market Heatmap</h1>
        <p className="text-sm text-muted-foreground">24h USD · Delta Exchange futures list</p>
      </header>
      <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
        {markets?.map((coin) => {
          const intensity = Math.abs(coin.change24h) / maxAbs;
          const isUp = coin.change24h >= 0;
          return (
            <Link
              key={coin.id}
              href={`/coin/${coin.id}?symbol=${coin.symbol}`}
              className={cn(
                "rounded-lg p-3 min-h-[72px] flex flex-col justify-between border border-border/40 transition-transform hover:scale-[1.02]",
                isUp ? "bg-bull" : "bg-bear"
              )}
              style={{ opacity: 0.4 + intensity * 0.6 }}
            >
              <span className="font-bold text-sm flex items-center gap-1.5">
                {formatPairLabel(coin.symbol)}
                <QualityBadge quality={grades?.[coin.symbol]?.quality} compact />
              </span>
              <span className={cn("text-xs font-mono", isUp ? "text-bull" : "text-bear")}>{formatPercent(coin.change24h)}</span>
            </Link>
          );
        })}
      </section>
    </section>
  );
}
