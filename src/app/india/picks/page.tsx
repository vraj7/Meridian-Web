"use client";

import Link from "next/link";
import { StockPickCard } from "@/components/india/stock-pick-card";
import { OptionsPlaybookSection } from "@/components/india/options-playbook-section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MarketStatusBanner } from "@/components/india/market-status-banner";
import { useIndiaIntelligence } from "@/hooks/use-india-intelligence";
import { formatPercent } from "@/lib/utils";

export default function IndiaPicksPage() {
  const { data, isLoading } = useIndiaIntelligence();

  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">India Market Picks</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Separate CALL/PUT buy & sell ideas, stock entry/exit timing, and India + global news impact.
          Educational analysis only — not SEBI-registered advice.
        </p>
        <Link href="/india" className="text-sm text-primary hover:underline mt-2 inline-block">
          ← India dashboard
        </Link>
      </header>

      <MarketStatusBanner />

      {isLoading ? (
        <Skeleton className="h-32" />
      ) : data?.news ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              News & macro mood
              <Badge
                variant={
                  data.news.marketMood === "risk-on"
                    ? "bull"
                    : data.news.marketMood === "risk-off"
                      ? "bear"
                      : "secondary"
                }
              >
                {data.news.marketMood}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="grid sm:grid-cols-3 gap-2 font-mono text-xs">
              <span>India news: {formatPercent(data.news.indiaNewsScore * 100)}</span>
              <span>Global news: {formatPercent(data.news.globalNewsScore * 100)}</span>
              <span>Combined: {formatPercent(data.news.overall * 100)}</span>
            </p>
            {data.news.warnings.map((w) => (
              <p key={w} className="text-xs text-warning border-l-2 border-warning pl-2">
                {w}
              </p>
            ))}
            <ul className="space-y-2 max-h-48 overflow-y-auto">
              {data.news.headlines.slice(0, 8).map((h) => (
                <li key={h.id}>
                  <a
                    href={h.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs hover:text-primary flex gap-2"
                  >
                    <Badge variant={h.category === "global" ? "warning" : "outline"} className="shrink-0">
                      {h.category}
                    </Badge>
                    <span>{h.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <section>
        <h2 className="text-xl font-bold mb-1">Stocks to BUY</h2>
        <p className="text-sm text-muted-foreground mb-4">When to enter, target, stop, and news context</p>
        {isLoading ? (
          <Skeleton className="h-40" />
        ) : data?.buyStocks.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.buyStocks.map((p) => (
              <StockPickCard key={p.id} pick={p} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No BUY ratings above confidence threshold.</p>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold mb-1">Stocks to SELL / avoid</h2>
        <p className="text-sm text-muted-foreground mb-4">Exit timing and bearish catalysts</p>
        {isLoading ? (
          <Skeleton className="h-40" />
        ) : data?.sellStocks.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.sellStocks.map((p) => (
              <StockPickCard key={p.id} pick={p} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No SELL signals at current threshold.</p>
        )}
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">Options — CALL & PUT (Buy / Sell)</h2>
        {isLoading ? (
          <Skeleton className="h-64" />
        ) : (
          <div className="space-y-6">
            {data?.optionsPlaybooks.map((pb) => (
              <OptionsPlaybookSection key={pb.underlying} playbook={pb} />
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
