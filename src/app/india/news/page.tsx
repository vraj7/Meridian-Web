"use client";

import { IndiaDisclaimer } from "@/components/india/india-disclaimer";
import { IndiaTerminalNav } from "@/components/india/india-terminal-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useIndiaTerminal } from "@/hooks/use-india-terminal";
import { formatDistanceToNow } from "date-fns";

export default function IndiaNewsPage() {
  const { data, isLoading } = useIndiaTerminal();
  const news = data?.news;

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">News Intelligence</h1>
        <p className="text-sm text-muted-foreground">
          India + global headlines · NLP sentiment · macro impact
        </p>
      </header>
      <IndiaTerminalNav />
      <IndiaDisclaimer />

      {isLoading ? (
        <Skeleton className="h-32" />
      ) : news ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Overall mood</p>
                <p className="font-semibold capitalize">{news.marketMood}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">India score</p>
                <p className="font-mono">{(news.indiaNewsScore * 100).toFixed(0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Global score</p>
                <p className="font-mono">{(news.globalNewsScore * 100).toFixed(0)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Combined</p>
                <p className="font-mono">{(news.overall * 100).toFixed(0)}</p>
              </CardContent>
            </Card>
          </div>

          {news.warnings.length > 0 && (
            <Card className="border-warning/40">
              <CardContent className="p-4 text-sm text-warning">
                {news.warnings.join(" · ")}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Headlines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {news.headlines.map((h) => (
                <article key={h.id} className="border-b border-border/40 pb-3 last:border-0">
                  <div className="flex flex-wrap gap-2 mb-1">
                    <Badge variant={h.sentiment === "bullish" ? "bull" : h.sentiment === "bearish" ? "bear" : "secondary"}>
                      {h.sentiment}
                    </Badge>
                    <Badge variant="outline">{h.category}</Badge>
                    {h.symbols.slice(0, 2).map((sym) => (
                      <Badge key={sym} variant="outline">
                        {sym}
                      </Badge>
                    ))}
                  </div>
                  <a
                    href={h.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium hover:text-primary"
                  >
                    {h.title}
                  </a>
                  <p className="text-xs text-muted-foreground mt-1">
                    {h.source} · {formatDistanceToNow(h.publishedAt, { addSuffix: true })} · Impact{" "}
                    {h.impactScore.toFixed(2)}
                  </p>
                </article>
              ))}
            </CardContent>
          </Card>
        </>
      ) : null}
    </section>
  );
}
