import {
  isCryptoTradeEligible,
  resolveCryptoSignalFilters,
} from "@/config/crypto-signal-filters";
import { CANDLE_LIMIT_HTF, CANDLE_LIMIT_PRIMARY } from "@/config/api";
import { HIGHER_TIMEFRAME } from "@/engines/crypto-timing-engine";
import { generateSignal } from "@/engines/signal-engine";
import { mapPool } from "@/lib/map-pool";
import type { CryptoQuotePair } from "@/config/market";
import { fetchCandles } from "@/services/candles";
import { fetchFuturesMetrics } from "@/services/futures";
import { fetchFullSentiment } from "@/services/sentiment";
import type { Candle, CoinGrade, Timeframe, TradingSignal } from "@/types";

export interface BatchScanCoin {
  symbol: string;
  coinId: string;
}

export interface BatchScanParams {
  coins: BatchScanCoin[];
  market: "spot" | "futures";
  timeframe: Timeframe;
  demoMode: boolean;
  minConfidence: number;
  relaxed: boolean;
  quotePair?: CryptoQuotePair;
  /** Parallel symbol workers (default 10). */
  concurrency?: number;
}

export interface BatchScanResult {
  signals: TradingSignal[];
  grades: Record<string, CoinGrade>;
}

function pickBestFuturesSignal(params: {
  symbol: string;
  coinId: string;
  candles: Candle[];
  higherTimeframeCandles?: Candle[];
  timeframe: Timeframe;
  sentiment: Awaited<ReturnType<typeof fetchFullSentiment>>;
  futures?: Awaited<ReturnType<typeof fetchFuturesMetrics>>;
  filters: ReturnType<typeof resolveCryptoSignalFilters>;
  quotePair: CryptoQuotePair;
}): TradingSignal | null {
  const base = {
    symbol: params.symbol,
    coinId: params.coinId,
    candles: params.candles,
    higherTimeframeCandles: params.higherTimeframeCandles,
    timeframe: params.timeframe,
    market: "futures" as const,
    sentiment: params.sentiment,
    futures: params.futures,
    minConfidence: params.filters.minConfidence,
    minConfirmations: params.filters.minConfirmations,
    minRiskReward: params.filters.minRiskReward,
    includeWeak: true,
    relaxed: params.filters.relaxed,
    quotePair: params.quotePair,
  };

  const longSignal = generateSignal({ ...base, tradeType: "futures_long" });
  const shortSignal = generateSignal({ ...base, tradeType: "futures_short" });

  const candidates = [longSignal, shortSignal].filter(
    (s): s is TradingSignal => !!s && s.action !== "WAIT" && s.action !== "HOLD"
  );

  if (candidates.length === 0) {
    return longSignal ?? shortSignal;
  }

  return candidates.sort((a, b) => b.confidence - a.confidence)[0];
}

type CandleCache = Map<string, Candle[]>;

function candleKey(symbol: string, timeframe: Timeframe): string {
  return `${symbol}:${timeframe}`;
}

async function buildCandleCache(
  coins: BatchScanCoin[],
  timeframe: Timeframe,
  htfTimeframe: Timeframe,
  demoMode: boolean,
  quotePair: CryptoQuotePair,
  concurrency: number
): Promise<CandleCache> {
  const cache: CandleCache = new Map();
  const jobs = new Map<string, () => Promise<Candle[]>>();

  for (const coin of coins) {
    jobs.set(candleKey(coin.symbol, timeframe), () =>
      fetchCandles(coin.symbol, timeframe, CANDLE_LIMIT_PRIMARY, demoMode, quotePair)
    );
    if (htfTimeframe !== timeframe) {
      jobs.set(candleKey(coin.symbol, htfTimeframe), () =>
        fetchCandles(coin.symbol, htfTimeframe, CANDLE_LIMIT_HTF, demoMode, quotePair).catch(
          () => [] as Candle[]
        )
      );
    }
  }

  await mapPool([...jobs.entries()], concurrency, async ([key, run]) => {
    cache.set(key, await run());
  });

  return cache;
}

/** Fetch candles + sentiment, then run the signal engine (CPU-only phase). */
export async function scanCryptoBatch(params: BatchScanParams): Promise<BatchScanResult> {
  const {
    coins,
    market,
    timeframe,
    demoMode,
    minConfidence,
    relaxed,
    quotePair = "USD",
    concurrency = 10,
  } = params;

  if (!coins.length) return { signals: [], grades: {} };

  const filters = resolveCryptoSignalFilters(minConfidence, relaxed);
  const htfTimeframe = HIGHER_TIMEFRAME[timeframe];

  const [sentiment, candleCache] = await Promise.all([
    fetchFullSentiment(demoMode),
    buildCandleCache(coins, timeframe, htfTimeframe, demoMode, quotePair, concurrency),
  ]);

  const signals: TradingSignal[] = [];
  const grades: Record<string, CoinGrade> = {};

  await mapPool(coins, concurrency, async (coin) => {
    try {
      const candles = candleCache.get(candleKey(coin.symbol, timeframe));
      if (!candles?.length) return;

      const htfCandles =
        htfTimeframe !== timeframe
          ? candleCache.get(candleKey(coin.symbol, htfTimeframe))
          : undefined;

      const futures =
        market === "futures"
          ? await fetchFuturesMetrics(coin.symbol, demoMode)
          : undefined;

      const signalParams = {
        minConfidence: filters.minConfidence,
        minConfirmations: filters.minConfirmations,
        minRiskReward: filters.minRiskReward,
        includeWeak: true,
        relaxed,
      };

      const assessed =
        market === "futures"
          ? pickBestFuturesSignal({
              symbol: coin.symbol,
              coinId: coin.coinId,
              candles,
              higherTimeframeCandles: htfCandles,
              timeframe,
              sentiment,
              futures,
              filters,
              quotePair,
            })
          : generateSignal({
              symbol: coin.symbol,
              coinId: coin.coinId,
              candles,
              higherTimeframeCandles: htfCandles,
              timeframe,
              market,
              sentiment,
              futures,
              quotePair,
              ...signalParams,
            });

      if (!assessed) return;

      const tradeEligible = isCryptoTradeEligible(assessed, filters);

      grades[coin.symbol] = {
        symbol: coin.symbol,
        coinId: coin.coinId,
        quality: assessed.quality ?? "C",
        action: assessed.action,
        confidence: assessed.confidence,
        tradeEligible,
      };

      if (tradeEligible) signals.push(assessed);
    } catch {
      /* skip symbol */
    }
  });

  return { signals, grades };
}
