import { API_PROVIDERS } from "@/config/api";
import { fetchJsonWithCors } from "@/lib/cors-fetch";
import type { Candle, Timeframe } from "@/types";

const YAHOO_INTERVAL: Record<Timeframe, string> = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "1h": "1h",
  "4h": "1h",
  "1D": "1d",
  "1W": "1wk",
};

const YAHOO_RANGE: Record<Timeframe, string> = {
  "1m": "1d",
  "5m": "5d",
  "15m": "5d",
  "1h": "1mo",
  "4h": "3mo",
  "1D": "1y",
  "1W": "5y",
};

interface YahooChartResponse {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        previousClose?: number;
        regularMarketVolume?: number;
        chartPreviousClose?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: (number | null)[];
          high?: (number | null)[];
          low?: (number | null)[];
          close?: (number | null)[];
          volume?: (number | null)[];
        }>;
      };
    }>;
  };
}

async function fetchYahooChart(url: string): Promise<YahooChartResponse> {
  return fetchJsonWithCors<YahooChartResponse>(url);
}

function parseChartResponse(data: YahooChartResponse): {
  candles: Candle[];
  closes: number[];
  volumes: number[];
} {
  const result = data.chart?.result?.[0];
  const timestamps = result?.timestamp ?? [];
  const q = result?.indicators?.quote?.[0];
  const candles: Candle[] = [];
  const closes: number[] = [];
  const volumes: number[] = [];

  timestamps.forEach((ts, i) => {
    const open = q?.open?.[i];
    const high = q?.high?.[i];
    const low = q?.low?.[i];
    const close = q?.close?.[i];
    const volume = q?.volume?.[i];
    if (open == null || high == null || low == null || close == null) return;
    candles.push({
      time: ts,
      open,
      high,
      low,
      close,
      volume: volume ?? 0,
    });
    closes.push(close);
    volumes.push(volume ?? 0);
  });

  return { candles, closes, volumes };
}

export async function fetchYahooQuote(
  yahooSymbol: string,
  /** Use 1m chart for live regularMarketPrice (indices / intraday LTP). */
  intraday = false
): Promise<{
  price: number;
  change24h: number;
  volume: number;
}> {
  const interval = intraday ? "1m" : "1d";
  const range = intraday ? "1d" : "5d";
  const url = `${API_PROVIDERS.yahooFinance.baseUrl}/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${range}`;
  const data = await fetchYahooChart(url);
  const meta = data.chart?.result?.[0]?.meta;

  if (meta?.regularMarketPrice && meta.regularMarketPrice > 0) {
    const price = meta.regularMarketPrice;
    const prev = meta.previousClose ?? meta.chartPreviousClose ?? price;
    const change24h = prev ? ((price - prev) / prev) * 100 : 0;
    return {
      price,
      change24h,
      volume: meta.regularMarketVolume ?? 0,
    };
  }

  const { closes, volumes } = parseChartResponse(data);
  const price = closes[closes.length - 1] ?? 0;
  const prev = closes[closes.length - 2] ?? price;
  const change24h = prev ? ((price - prev) / prev) * 100 : 0;
  return { price, change24h, volume: volumes[volumes.length - 1] ?? 0 };
}

export async function fetchYahooCandles(
  yahooSymbol: string,
  timeframe: Timeframe
): Promise<Candle[]> {
  const interval = YAHOO_INTERVAL[timeframe];
  const range = YAHOO_RANGE[timeframe];
  const url = `${API_PROVIDERS.yahooFinance.baseUrl}/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${range}`;
  const data = await fetchYahooChart(url);
  return parseChartResponse(data).candles;
}
