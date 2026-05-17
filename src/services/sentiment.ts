import { API_PROVIDERS, CACHE_TTL } from "@/config/api";
import { BRAND } from "@/config/brand";
import { DEMO_SENTIMENT } from "@/data/demo";
import { axiosGet, fetchWithFallback } from "@/lib/api-client";
import type { NewsItem, SentimentData } from "@/types";

const BULLISH_WORDS = [
  "surge", "rally", "bullish", "breakout", "adoption", "inflow", "upgrade", "partnership", "ath", "record",
];
const BEARISH_WORDS = [
  "crash", "dump", "bearish", "hack", "ban", "lawsuit", "selloff", "outflow", "fraud", "collapse",
];

function analyzeText(text: string): { sentiment: NewsItem["sentiment"]; score: number } {
  const lower = text.toLowerCase();
  let bull = 0;
  let bear = 0;
  BULLISH_WORDS.forEach((w) => { if (lower.includes(w)) bull++; });
  BEARISH_WORDS.forEach((w) => { if (lower.includes(w)) bear++; });
  const score = (bull - bear) / Math.max(1, bull + bear);
  if (score > 0.2) return { sentiment: "bullish", score };
  if (score < -0.2) return { sentiment: "bearish", score: Math.abs(score) };
  return { sentiment: "neutral", score: 0 };
}

export async function fetchFearGreed(demoMode = false): Promise<{ value: number; label: string }> {
  if (demoMode) return { value: DEMO_SENTIMENT.fearGreed, label: DEMO_SENTIMENT.fearGreedLabel };

  return fetchWithFallback({
    cacheKey: "fear-greed",
    cacheTtl: CACHE_TTL.fearGreed,
    demoFallback: () => ({ value: 50, label: "Neutral" }),
    providers: [
      {
        name: "alternative.me",
        fetch: async () => {
          const data = await axiosGet<{
            data: Array<{ value: string; value_classification: string }>;
          }>(`${API_PROVIDERS.fearGreed.baseUrl}/?limit=1`);
          const item = data.data[0];
          return { value: parseInt(item.value, 10), label: item.value_classification };
        },
      },
    ],
  });
}

export async function fetchRedditSentiment(demoMode = false): Promise<number> {
  if (demoMode) return DEMO_SENTIMENT.socialScore;

  try {
    const data = await axiosGet<{
      data: { children: Array<{ data: { title: string; score: number } }> };
    }>("https://www.reddit.com/r/CryptoCurrency/hot.json?limit=15", {
      headers: { "User-Agent": BRAND.userAgent },
    });

    let score = 0;
    data.data.children.forEach((post) => {
      const analysis = analyzeText(post.data.title);
      const weight = Math.log10(Math.max(1, post.data.score));
      if (analysis.sentiment === "bullish") score += weight * analysis.score;
      if (analysis.sentiment === "bearish") score -= weight * analysis.score;
    });
    return Math.max(-1, Math.min(1, score / 10));
  } catch {
    return 0;
  }
}

export async function fetchNews(demoMode = false): Promise<NewsItem[]> {
  if (demoMode) return DEMO_SENTIMENT.headlines;

  const redditNews: NewsItem[] = [];
  try {
    const data = await axiosGet<{
      data: { children: Array<{ data: { id: string; title: string; url: string; created_utc: number } }> };
    }>("https://www.reddit.com/r/CryptoCurrency/new.json?limit=20", {
      headers: { "User-Agent": BRAND.userAgent },
    });

    data.data.children.forEach((post) => {
      const { sentiment, score } = analyzeText(post.data.title);
      const coins: string[] = [];
      ["BTC", "ETH", "SOL", "XRP", "BNB", "DOGE"].forEach((sym) => {
        if (post.data.title.toUpperCase().includes(sym)) coins.push(sym);
      });
      redditNews.push({
        id: post.data.id,
        title: post.data.title,
        source: "Reddit",
        url: post.data.url,
        sentiment,
        score,
        coins,
        publishedAt: post.data.created_utc * 1000,
      });
    });
  } catch {
    /* fallback */
  }

  return redditNews.length > 0 ? redditNews : DEMO_SENTIMENT.headlines;
}

export async function fetchFullSentiment(demoMode = false): Promise<SentimentData> {
  const [fg, social, headlines] = await Promise.all([
    fetchFearGreed(demoMode),
    fetchRedditSentiment(demoMode),
    fetchNews(demoMode),
  ]);

  let newsScore = 0;
  headlines.forEach((h) => {
    if (h.sentiment === "bullish") newsScore += h.score;
    if (h.sentiment === "bearish") newsScore -= h.score;
  });
  newsScore = Math.max(-1, Math.min(1, newsScore / Math.max(1, headlines.length)));

  const fgNorm = (fg.value - 50) / 50;
  const overall = fgNorm * 0.4 + social * 0.3 + newsScore * 0.3;

  return {
    fearGreed: fg.value,
    fearGreedLabel: fg.label,
    newsScore,
    socialScore: social,
    overall,
    headlines,
  };
}
