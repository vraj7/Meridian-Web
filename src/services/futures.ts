import { API_PROVIDERS, CACHE_TTL } from "@/config/api";
import { QUOTE_CURRENCY } from "@/config/market";
import { getDemoFutures } from "@/data/demo";
import { axiosGet, fetchWithFallback } from "@/lib/api-client";
import { dedupeAsync } from "@/lib/request-dedup";
import { fetchWithFuturesPairFallback } from "@/lib/exchange-pairs";
import { isDeltaFuturesSymbol } from "@/config/delta-exchange-futures";
import type { FuturesMetrics } from "@/types";

const NEUTRAL_FUTURES = (symbol: string): FuturesMetrics => ({
  symbol,
  fundingRate: 0,
  openInterest: 0,
  longShortRatio: 1,
  squeezeRisk: "none",
  volatilityAlert: false,
});

async function fetchBinanceFuturesForPair(
  symbol: string,
  pair: string
): Promise<FuturesMetrics | null> {
  const base = API_PROVIDERS.binance.futuresUrl;

  const funding = await axiosGet<
    | Array<{ lastFundingRate: string }>
    | { lastFundingRate: string }
  >(`${base}/premiumIndex?symbol=${pair}`).catch(() => null);

  const oi = await axiosGet<{ openInterest: string }>(
    `${base}/openInterest?symbol=${pair}`
  ).catch(() => null);

  if (!funding && !oi) return null;

  const fundingRate = funding
    ? parseFloat(
        Array.isArray(funding)
          ? funding[0]?.lastFundingRate ?? "0"
          : funding.lastFundingRate
      )
    : 0;

  const openInterest = oi ? parseFloat(oi.openInterest) : 0;
  const longShortRatio = 1;

  let squeezeRisk: FuturesMetrics["squeezeRisk"] = "none";
  if (fundingRate < -0.005 && longShortRatio > 1.5) squeezeRisk = "short";
  if (fundingRate > 0.005 && longShortRatio < 0.7) squeezeRisk = "long";

  return {
    symbol,
    fundingRate,
    openInterest,
    longShortRatio,
    squeezeRisk,
    volatilityAlert: Math.abs(fundingRate) > 0.015,
  };
}

export async function fetchFuturesMetrics(
  symbol: string,
  demoMode = false
): Promise<FuturesMetrics> {
  if (demoMode) return getDemoFutures(symbol);
  if (!isDeltaFuturesSymbol(symbol)) return NEUTRAL_FUTURES(symbol);

  return dedupeAsync(`futures:${symbol}:${demoMode}`, () =>
    fetchWithFallback({
    cacheKey: `futures:${symbol}:${QUOTE_CURRENCY}`,
    cacheTtl: CACHE_TTL.futures,
    demoFallback: () => getDemoFutures(symbol),
    providers: [
      {
        name: "binance-futures",
        fetch: async () => {
          const { data } = await fetchWithFuturesPairFallback(symbol, (pair) =>
            fetchBinanceFuturesForPair(symbol, pair)
          );
          return data;
        },
      },
      {
        name: "bybit-futures",
        fetch: async () => {
          const { data } = await fetchWithFuturesPairFallback(symbol, async (pair) => {
            const [ticker, oi] = await Promise.all([
              axiosGet<{ result: { list: Array<{ fundingRate: string }> } }>(
                `${API_PROVIDERS.bybit.baseUrl}/market/tickers?category=linear&symbol=${pair}`
              ),
              axiosGet<{ result: { list: Array<{ openInterest: string }> } }>(
                `${API_PROVIDERS.bybit.baseUrl}/market/open-interest?category=linear&symbol=${pair}&intervalTime=1h&limit=1`
              ),
            ]);

            const fundingRate = parseFloat(ticker.result.list[0]?.fundingRate ?? "0");
            const openInterest = parseFloat(oi.result.list[0]?.openInterest ?? "0");

            let squeezeRisk: FuturesMetrics["squeezeRisk"] = "none";
            if (fundingRate < -0.005) squeezeRisk = "short";
            else if (fundingRate > 0.005) squeezeRisk = "long";

            return {
              symbol,
              fundingRate,
              openInterest,
              longShortRatio: 1,
              squeezeRisk,
              volatilityAlert: Math.abs(fundingRate) > 0.015,
            };
          });
          return data;
        },
      },
    ],
    })
  );
}
