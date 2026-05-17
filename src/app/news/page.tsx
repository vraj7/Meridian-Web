"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSentiment } from "@/hooks/use-sentiment";
import { formatDistanceToNow } from "date-fns";

export default function NewsPage() {
  const { data: sentiment, isLoading } = useSentiment();

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">News & Sentiment</h1>
        <p className="text-sm text-muted-foreground">NLP keyword analysis · Reddit feed · Fear & Greed</p>
      </header>
      {sentiment && (
        <section className="grid sm:grid-cols-3 gap-3">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Fear & Greed</p><p className="text-xl font-bold">{sentiment.fearGreed} — {sentiment.fearGreedLabel}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">News score</p><p className="text-xl font-bold">{(sentiment.newsScore * 100).toFixed(0)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Social score</p><p className="text-xl font-bold">{(sentiment.socialScore * 100).toFixed(0)}</p></CardContent></Card>
        </section>
      )}
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : (
        <ul className="space-y-3">
          {sentiment?.headlines.map((n) => (
            <li key={n.id}>
              <a href={n.url} target="_blank" rel="noopener noreferrer" className="block glass rounded-xl p-4 hover:border-primary/30">
                <Badge variant={n.sentiment === "bullish" ? "bull" : n.sentiment === "bearish" ? "bear" : "secondary"}>{n.sentiment}</Badge>
                <p className="mt-2 font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{n.source} · {formatDistanceToNow(n.publishedAt, { addSuffix: true })}{n.coins.length ? ` · ${n.coins.join(", ")}` : ""}</p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
