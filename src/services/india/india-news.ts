import { CACHE_TTL } from "@/config/api";
import { NIFTY_50_STOCKS } from "@/config/india-stocks";
import { axiosGet, fetchWithFallback } from "@/lib/api-client";
import { fetchTextWithCors } from "@/lib/cors-fetch";
import type { IndiaNewsItem, IndiaNewsSentiment } from "@/types/india";

const BULLISH = [
  "rally", "surge", "gain", "upgrade", "beat", "record", "inflow", "reform", "rate cut",
  "bullish", "expansion", "profit", "growth", "buy", "outperform", "recovery",
];
const BEARISH = [
  "crash", "fall", "drop", "downgrade", "miss", "outflow", "war", "sanction", "inflation",
  "bearish", "loss", "decline", "sell", "underperform", "recession", "hike", "selloff",
];
const GLOBAL_IMPACT = [
  "fed", "fomc", "us jobs", "china", "oil", "crude", "dollar", "dxy", "geopolitical",
  "middle east", "tariff", "trade war", "us election", "treasury", "yield", "opec",
  "russia", "ukraine", "bitcoin", "global selloff", "wall street", "nasdaq", "s&p",
];

function analyzeHeadline(text: string): { sentiment: IndiaNewsItem["sentiment"]; score: number; isGlobal: boolean } {
  const lower = text.toLowerCase();
  let bull = 0;
  let bear = 0;
  BULLISH.forEach((w) => { if (lower.includes(w)) bull++; });
  BEARISH.forEach((w) => { if (lower.includes(w)) bear++; });
  const isGlobal = GLOBAL_IMPACT.some((w) => lower.includes(w));
  const score = (bull - bear) / Math.max(1, bull + bear);
  if (score > 0.2) return { sentiment: "bullish", score, isGlobal };
  if (score < -0.2) return { sentiment: "bearish", score: Math.abs(score), isGlobal };
  return { sentiment: "neutral", score: 0, isGlobal };
}

function mapStocks(text: string): string[] {
  const upper = text.toUpperCase();
  const found: string[] = [];
  NIFTY_50_STOCKS.forEach((s) => {
    if (upper.includes(s.symbol) || upper.includes(s.name.toUpperCase())) found.push(s.symbol);
  });
  if (upper.includes("NIFTY") || upper.includes("NSE")) found.push("NIFTY");
  if (upper.includes("BANK NIFTY") || upper.includes("BANKNIFTY")) found.push("BANKNIFTY");
  if (upper.includes("SENSEX") || upper.includes("BSE")) found.push("SENSEX");
  return [...new Set(found)];
}

const DEMO_NEWS: IndiaNewsItem[] = [
  {
    id: "d1",
    title: "FIIs turn net buyers in Indian equities after global rate pause hopes",
    source: "Demo · Global Macro",
    url: "#",
    sentiment: "bullish",
    score: 0.6,
    category: "global",
    symbols: ["NIFTY"],
    impactScore: 0.7,
    publishedAt: Date.now() - 3600000,
  },
  {
    id: "d2",
    title: "Crude oil slips; positive for India import basket and INR sentiment",
    source: "Demo · Commodities",
    url: "#",
    sentiment: "bullish",
    score: 0.5,
    category: "global",
    symbols: ["RELIANCE", "ONGC"],
    impactScore: 0.55,
    publishedAt: Date.now() - 7200000,
  },
  {
    id: "d3",
    title: "RBI holds rates steady; banking stocks mixed in early trade",
    source: "Demo · India",
    url: "#",
    sentiment: "neutral",
    score: 0.1,
    category: "india",
    symbols: ["HDFCBANK", "ICICIBANK", "SBIN"],
    impactScore: 0.5,
    publishedAt: Date.now() - 10800000,
  },
];

async function fetchRedditIndia(): Promise<IndiaNewsItem[]> {
  const subs = ["IndiaInvestments", "IndianStreetBets", "StockMarketIndia"];
  const items: IndiaNewsItem[] = [];

  for (const sub of subs) {
    try {
      const data = await axiosGet<{
        data: { children: Array<{ data: { id: string; title: string; url: string; created_utc: number; score: number } }> };
      }>(`https://www.reddit.com/r/${sub}/hot.json?limit=12`, {
        headers: { "User-Agent": "CryptoTerminal-India/1.0" },
      });

      data.data.children.forEach((post) => {
        const { sentiment, score, isGlobal } = analyzeHeadline(post.data.title);
        const symbols = mapStocks(post.data.title);
        items.push({
          id: post.data.id,
          title: post.data.title,
          source: `Reddit /r/${sub}`,
          url: post.data.url.startsWith("http") ? post.data.url : `https://reddit.com${post.data.url}`,
          sentiment,
          score,
          category: isGlobal ? "global" : "india",
          symbols,
          impactScore: Math.min(1, Math.log10(Math.max(1, post.data.score)) / 3 + score * 0.3),
          publishedAt: post.data.created_utc * 1000,
        });
      });
    } catch {
      /* skip sub */
    }
  }
  return items;
}

/** Google News RSS (free, no key) — India market + world economy */
async function fetchGoogleNewsRss(query: string, category: "india" | "global"): Promise<IndiaNewsItem[]> {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
    const text = await fetchTextWithCors(url);
    const items: IndiaNewsItem[] = [];
    const titles = [...text.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>/g)].map((m) => m[1]);
    const links = [...text.matchAll(/<link>(.*?)<\/link>/g)].map((m) => m[1]);
    const dates = [...text.matchAll(/<pubDate>(.*?)<\/pubDate>/g)].map((m) => m[1]);

    titles.slice(1, 16).forEach((title, i) => {
      const { sentiment, score, isGlobal } = analyzeHeadline(title);
      items.push({
        id: `gnews-${category}-${i}-${Date.now()}`,
        title,
        source: category === "global" ? "Google News · Global" : "Google News · India",
        url: links[i + 1] ?? "#",
        sentiment,
        score,
        category: isGlobal || category === "global" ? "global" : "india",
        symbols: mapStocks(title),
        impactScore: 0.4 + score * 0.3,
        publishedAt: dates[i + 1] ? new Date(dates[i + 1]).getTime() : Date.now(),
      });
    });
    return items;
  } catch {
    return [];
  }
}

export function aggregateNewsSentiment(items: IndiaNewsItem[]): IndiaNewsSentiment {
  let indiaScore = 0;
  let globalScore = 0;
  let indiaN = 0;
  let globalN = 0;

  items.forEach((item) => {
    const dir = item.sentiment === "bullish" ? 1 : item.sentiment === "bearish" ? -1 : 0;
    const weight = item.impactScore;
    if (item.category === "global") {
      globalScore += dir * weight;
      globalN++;
    } else {
      indiaScore += dir * weight;
      indiaN++;
    }
  });

  const india = indiaN > 0 ? indiaScore / indiaN : 0;
  const global = globalN > 0 ? globalScore / globalN : 0;
  const overall = india * 0.45 + global * 0.55;

  let marketMood: IndiaNewsSentiment["marketMood"] = "neutral";
  if (overall > 0.15) marketMood = "risk-on";
  if (overall < -0.15) marketMood = "risk-off";

  const warnings: string[] = [];
  if (global < -0.2) warnings.push("Negative global macro headlines — caution on longs");
  if (global > 0.2) warnings.push("Supportive global backdrop for Indian equities");
  if (india < -0.2) warnings.push("Weak India-specific news flow");
  items
    .filter((i) => i.sentiment === "bearish" && i.category === "global")
    .slice(0, 2)
    .forEach((i) => warnings.push(`Global: ${i.title.slice(0, 80)}…`));

  return {
    indiaNewsScore: india,
    globalNewsScore: global,
    overall,
    marketMood,
    headlines: items.sort((a, b) => b.publishedAt - a.publishedAt).slice(0, 30),
    warnings,
  };
}

export async function fetchIndiaNews(demoMode = false): Promise<IndiaNewsSentiment> {
  if (demoMode) return aggregateNewsSentiment(DEMO_NEWS);

  return fetchWithFallback({
    cacheKey: "india-news",
    cacheTtl: CACHE_TTL.news,
    errorFallback: () => aggregateNewsSentiment(DEMO_NEWS),
    allowErrorFallback: true,
    providers: [
      {
        name: "reddit-india",
        fetch: async () => {
          const [reddit, indiaRss, globalRss] = await Promise.all([
            fetchRedditIndia(),
            fetchGoogleNewsRss("NSE NIFTY stock market India", "india"),
            fetchGoogleNewsRss("US Fed oil crude global markets economy", "global"),
          ]);
          const merged = [...reddit, ...indiaRss, ...globalRss];
          if (merged.length < 3) throw new Error("Insufficient news");
          return aggregateNewsSentiment(merged);
        },
      },
    ],
  });
}

/** Per-symbol news impact score -1 to 1 */
export function getSymbolNewsBias(
  symbol: string,
  sentiment: IndiaNewsSentiment
): { score: number; headlines: IndiaNewsItem[]; note: string } {
  const related = sentiment.headlines.filter(
    (h) => h.symbols.includes(symbol) || (symbol === "NIFTY" && h.symbols.includes("NIFTY"))
  );
  if (related.length === 0) {
    return {
      score: sentiment.overall * 0.5,
      headlines: sentiment.headlines.filter((h) => h.category === "global").slice(0, 3),
      note: "No direct headlines — using broad market & global sentiment",
    };
  }
  let score = 0;
  related.forEach((h) => {
    if (h.sentiment === "bullish") score += h.impactScore;
    if (h.sentiment === "bearish") score -= h.impactScore;
  });
  score = Math.max(-1, Math.min(1, score / related.length));
  return { score, headlines: related.slice(0, 5), note: `${related.length} relevant headline(s)` };
}
