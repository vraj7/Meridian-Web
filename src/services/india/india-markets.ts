import { CACHE_TTL } from "@/config/api";
import { INDIA_INDICES, NIFTY_50_STOCKS } from "@/config/india-stocks";
import { DEMO_INDIA_STOCKS } from "@/data/india-demo";
import { fetchWithFallback } from "@/lib/api-client";
import { fetchStooqQuote } from "./stooq-india";
import { fetchYahooQuote } from "./yahoo-india";
import type { IndianStock } from "@/types/india";

async function fetchQuoteWithFallback(yahooSymbol: string, intradayLtp = false) {
  try {
    return await fetchYahooQuote(yahooSymbol, intradayLtp);
  } catch {
    const stooq = await fetchStooqQuote(yahooSymbol);
    if (stooq) return stooq;
    throw new Error(`No quote for ${yahooSymbol}`);
  }
}

export async function fetchIndiaStocks(demoMode = false): Promise<IndianStock[]> {
  if (demoMode) return DEMO_INDIA_STOCKS;

  return fetchWithFallback({
    cacheKey: "india-stocks",
    cacheTtl: CACHE_TTL.indiaMarkets,
    demoFallback: () => DEMO_INDIA_STOCKS,
    providers: [
      {
        name: "yahoo-finance-india",
        fetch: async () => {
          const stocks: IndianStock[] = [];
          let rank = 1;

          for (const idx of INDIA_INDICES) {
            try {
              const q = await fetchQuoteWithFallback(idx.yahoo, true);
              stocks.push({
                id: idx.symbol.toLowerCase(),
                symbol: idx.symbol,
                name: idx.name,
                yahooSymbol: idx.yahoo,
                nseSymbol: idx.nse,
                rank: rank++,
                price: q.price,
                quoteCurrency: "INR",
                change24h: q.change24h,
                volume24h: q.volume,
                segment: "index",
              });
            } catch {
              /* skip index */
            }
          }

          for (const s of NIFTY_50_STOCKS) {
            try {
              const q = await fetchQuoteWithFallback(s.yahoo);
              stocks.push({
                id: s.nse.toLowerCase(),
                symbol: s.symbol,
                name: s.name,
                yahooSymbol: s.yahoo,
                nseSymbol: s.nse,
                rank: rank++,
                price: q.price,
                quoteCurrency: "INR",
                change24h: q.change24h,
                volume24h: q.volume,
                segment: "equity",
              });
              await new Promise((r) => setTimeout(r, 120));
            } catch {
              /* skip stock */
            }
          }

          if (stocks.length < 5) throw new Error("Insufficient market data");
          return stocks.sort((a, b) => a.rank - b.rank);
        },
      },
      {
        name: "stooq-india",
        fetch: async () => {
          const stocks: IndianStock[] = [];
          let rank = 1;
          for (const s of NIFTY_50_STOCKS.slice(0, 25)) {
            const q = await fetchStooqQuote(s.yahoo);
            if (q) {
              stocks.push({
                id: s.nse.toLowerCase(),
                symbol: s.symbol,
                name: s.name,
                yahooSymbol: s.yahoo,
                nseSymbol: s.nse,
                rank: rank++,
                price: q.price,
                quoteCurrency: "INR",
                change24h: q.change24h,
                volume24h: q.volume,
                segment: "equity",
              });
            }
          }
          if (stocks.length < 5) throw new Error("Stooq insufficient");
          return stocks;
        },
      },
    ],
  });
}

export async function fetchIndiaStockBySymbol(
  symbol: string,
  demoMode = false
): Promise<IndianStock | undefined> {
  const all = await fetchIndiaStocks(demoMode);
  return all.find((s) => s.symbol === symbol || s.nseSymbol === symbol);
}
