import { axiosGet } from "@/lib/api-client";
import {
  getFuturesPairCandidates,
  getTradingPairCandidates,
} from "@/lib/pairs";

/**
 * Try each USD / USDT pair until one returns data from the given fetcher.
 */
export async function fetchWithUsdPairFallback<T>(
  symbol: string,
  fetcher: (pair: string) => Promise<T | null | undefined>,
  candidates = getTradingPairCandidates(symbol)
): Promise<{ data: T; pair: string }> {
  const errors: string[] = [];

  for (const pair of candidates) {
    try {
      const data = await fetcher(pair);
      if (data != null && (!(Array.isArray(data)) || data.length > 0)) {
        return { data, pair };
      }
      errors.push(`${pair}: empty`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${pair}: ${msg}`);
    }
  }

  throw new Error(`No ${symbol}/USD market found (${errors.join("; ")})`);
}

/** Futures venues (Binance USD-M) use BASEUSDT symbols only. */
export async function fetchWithFuturesPairFallback<T>(
  symbol: string,
  fetcher: (pair: string) => Promise<T | null | undefined>
): Promise<{ data: T; pair: string }> {
  return fetchWithUsdPairFallback(symbol, fetcher, getFuturesPairCandidates(symbol));
}

/** Quick Binance spot symbol check (optional optimization). */
export async function binanceSymbolExists(pair: string): Promise<boolean> {
  try {
    await axiosGet<{ symbol: string }>(
      `https://api.binance.com/api/v3/ticker/price?symbol=${pair}`
    );
    return true;
  } catch {
    return false;
  }
}
