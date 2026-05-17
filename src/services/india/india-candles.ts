import { CACHE_TTL } from "@/config/api";
import { NIFTY_50_STOCKS, INDIA_FNO_UNDERLYINGS } from "@/config/india-stocks";
import { getDemoIndiaCandles } from "@/data/india-demo";
import { fetchWithFallback } from "@/lib/api-client";
import { fetchYahooCandles } from "./yahoo-india";
import type { Candle, Timeframe } from "@/types";

function resolveYahooSymbol(symbol: string): string {
  const stock = NIFTY_50_STOCKS.find((s) => s.symbol === symbol || s.nse === symbol);
  if (stock) return stock.yahoo;
  const fno = INDIA_FNO_UNDERLYINGS.find((s) => s.symbol === symbol);
  if (fno) return fno.yahoo;
  return `${symbol}.NS`;
}

export async function fetchIndiaCandles(
  symbol: string,
  timeframe: Timeframe,
  demoMode = false
): Promise<Candle[]> {
  if (demoMode) return getDemoIndiaCandles(symbol);

  const yahooSymbol = resolveYahooSymbol(symbol);
  const cacheKey = `india-candles:${yahooSymbol}:${timeframe}`;

  return fetchWithFallback({
    cacheKey,
    cacheTtl: CACHE_TTL.indiaCandles,
    demoFallback: () => getDemoIndiaCandles(symbol),
    providers: [
      {
        name: "yahoo-india",
        fetch: () => fetchYahooCandles(yahooSymbol, timeframe),
      },
    ],
  });
}
