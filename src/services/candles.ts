import { API_PROVIDERS, BINANCE_INTERVALS, CACHE_TTL, CANDLE_LIMIT_PRIMARY } from "@/config/api";
import { dedupeAsync } from "@/lib/request-dedup";
import type { CryptoQuotePair } from "@/config/market";
import { getDemoCandles } from "@/data/demo";
import { axiosGet, fetchWithFallback } from "@/lib/api-client";
import { fetchWithUsdPairFallback } from "@/lib/exchange-pairs";
import { getBinanceSpotPairCandidates } from "@/lib/pairs";
import type { Candle, Timeframe } from "@/types";

interface BinanceKline {
  0: number;
  1: string;
  2: string;
  3: string;
  4: string;
  5: string;
}

function mapBinanceKlines(data: BinanceKline[]): Candle[] {
  return data.map((k) => ({
    time: Math.floor(k[0] / 1000),
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
  }));
}

export function candlesCacheKey(
  symbol: string,
  timeframe: Timeframe,
  limit: number,
  demoMode: boolean
): string {
  return `candles:${symbol}:${timeframe}:${limit}:${demoMode}`;
}

export async function fetchCandles(
  symbol: string,
  timeframe: Timeframe,
  limit = CANDLE_LIMIT_PRIMARY,
  demoMode = false,
  quotePair: CryptoQuotePair = "USD"
): Promise<Candle[]> {
  if (demoMode) return getDemoCandles(symbol);

  const interval = BINANCE_INTERVALS[timeframe];
  const cacheKey = `candles:${symbol}:${quotePair}:${interval}:${limit}`;
  const inflightKey = candlesCacheKey(symbol, timeframe, limit, demoMode);

  return dedupeAsync(inflightKey, () =>
    fetchWithFallback({
    cacheKey,
    cacheTtl: CACHE_TTL.candles,
    demoFallback: () => getDemoCandles(symbol),
    providers: [
      {
        name: "binance",
        fetch: async () => {
          const { data } = await fetchWithUsdPairFallback(
            symbol,
            async (pair) => {
              const klines = await axiosGet<BinanceKline[]>(
                `${API_PROVIDERS.binance.baseUrl}/klines?symbol=${pair}&interval=${interval}&limit=${limit}`
              );
              if (!klines?.length) return null;
              return mapBinanceKlines(klines);
            },
            getBinanceSpotPairCandidates(symbol, quotePair)
          );
          return data;
        },
      },
      {
        name: "bybit",
        fetch: async () => {
          const intervalMap: Record<string, string> = {
            "1m": "1", "5m": "5", "15m": "15", "1h": "60", "4h": "240", "1D": "D", "1W": "W",
          };
          const { data } = await fetchWithUsdPairFallback(
            symbol,
            async (pair) => {
            const res = await axiosGet<{ result: { list: string[][] } }>(
              `${API_PROVIDERS.bybit.baseUrl}/market/kline?category=spot&symbol=${pair}&interval=${intervalMap[timeframe]}&limit=${limit}`
            );
            return res.result.list
              .map((k) => ({
                time: Math.floor(parseInt(k[0], 10) / 1000),
                open: parseFloat(k[1]),
                high: parseFloat(k[2]),
                low: parseFloat(k[3]),
                close: parseFloat(k[4]),
                volume: parseFloat(k[5]),
              }))
              .reverse();
          },
            getBinanceSpotPairCandidates(symbol, quotePair)
          );
          return data;
        },
      },
      {
        name: "cryptocompare",
        fetch: async () => {
          const aggregateMap: Record<string, number> = {
            "1m": 1, "5m": 5, "15m": 15, "1h": 60, "4h": 240, "1D": 1440, "1W": 10080,
          };
          const res = await axiosGet<{
            Data: { Data: Array<{ time: number; open: number; high: number; low: number; close: number; volumeto: number }> };
          }>(
            `${API_PROVIDERS.cryptocompare.baseUrl}/v2/histominute?fsym=${symbol}&tsym=${quotePair}&limit=${limit}&aggregate=${aggregateMap[timeframe]}`
          );
          return res.Data.Data.map((k) => ({
            time: k.time,
            open: k.open,
            high: k.high,
            low: k.low,
            close: k.close,
            volume: k.volumeto,
          }));
        },
      },
    ],
    })
  );
}
