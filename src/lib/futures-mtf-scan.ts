import { CANDLE_LIMIT_HTF, CANDLE_LIMIT_PRIMARY } from "@/config/api";
import {
  assessFuturesIntradayCoin,
  evaluateFuturesIntradaySetup,
} from "@/engines/futures-mtf/evaluate";
import { pearsonCorrelation } from "@/engines/futures-mtf/context-analysis";
import { computeExtendedIndicators } from "@/engines/futures-mtf/extended-indicators";
import { mapPool } from "@/lib/map-pool";
import { formatPairLabel } from "@/config/market";
import type { CryptoQuotePair } from "@/config/market";
import { fetchCandles } from "@/services/candles";
import { fetchFuturesMetrics } from "@/services/futures";
import { fetchBtcDominance } from "@/services/markets";
import { fetchFullSentiment } from "@/services/sentiment";
import type { Candle, Timeframe } from "@/types";
import type {
  FuturesIntradayAssessment,
  FuturesIntradayContext,
  FuturesIntradaySignal,
  FuturesMtfCandles,
  FuturesMtfScanResult,
} from "@/types/futures-intraday";

export interface FuturesMtfScanCoin {
  symbol: string;
  coinId: string;
}

export interface FuturesMtfScanParams {
  coins: FuturesMtfScanCoin[];
  demoMode: boolean;
  quotePair?: CryptoQuotePair;
  concurrency?: number;
}

const MTF_MAP: { key: keyof FuturesMtfCandles; tf: Timeframe }[] = [
  { key: "5m", tf: "5m" },
  { key: "15m", tf: "15m" },
  { key: "1h", tf: "1h" },
  { key: "4h", tf: "4h" },
  { key: "1d", tf: "1D" },
];

async function fetchMtfSet(
  symbol: string,
  demoMode: boolean,
  quotePair: CryptoQuotePair
): Promise<FuturesMtfCandles | null> {
  const fetched = await Promise.all(
    MTF_MAP.map(async ({ key, tf }) => {
      const limit = tf === "1D" || tf === "4h" ? CANDLE_LIMIT_HTF : CANDLE_LIMIT_PRIMARY;
      const candles = await fetchCandles(symbol, tf, limit, demoMode, quotePair).catch(
        () => [] as Candle[]
      );
      return { key, candles };
    })
  );
  const set: FuturesMtfCandles = {
    "5m": [],
    "15m": [],
    "1h": [],
    "4h": [],
    "1d": [],
  };
  for (const { key, candles } of fetched) {
    set[key] = candles;
  }
  if (!set["15m"].length || !set["5m"].length) return null;
  return set;
}

function buildContextFromCandles(
  symbol: string,
  asset15: Candle[],
  btc15: Candle[],
  btcDominance?: number,
  fearGreed?: number
): FuturesIntradayContext {
  const assetCloses = asset15.map((c) => c.close);
  const btcCloses = btc15.map((c) => c.close);
  const btcInd = btc15.length >= 60 ? computeExtendedIndicators(btc15) : null;
  return {
    btcTrend: btcInd?.trend ?? "Sideways",
    btcDominance,
    fearGreed,
    btcCorrelation: pearsonCorrelation(assetCloses, btcCloses),
  };
}

export async function scanFuturesMtfBatch(
  params: FuturesMtfScanParams
): Promise<FuturesMtfScanResult> {
  const { coins, demoMode, quotePair = "USD", concurrency = 8 } = params;
  if (!coins.length) return { signals: [], assessments: [], scanned: 0, rejected: 0 };

  const [sentiment, dominance, btcCandles] = await Promise.all([
    fetchFullSentiment(demoMode).catch(() => null),
    fetchBtcDominance(demoMode).catch(() => undefined),
    fetchCandles("BTC", "15m", CANDLE_LIMIT_PRIMARY, demoMode, quotePair).catch(
      () => [] as Candle[]
    ),
  ]);

  const signals: FuturesIntradaySignal[] = [];
  const assessments: FuturesIntradayAssessment[] = [];
  let rejected = 0;

  await mapPool(coins, concurrency, async (coin) => {
    try {
      const [candles, futures] = await Promise.all([
        fetchMtfSet(coin.symbol, demoMode, quotePair),
        fetchFuturesMetrics(coin.symbol, demoMode),
      ]);
      if (!candles) {
        rejected++;
        assessments.push({
          symbol: coin.symbol,
          coinId: coin.coinId,
          pairLabel: formatPairLabel(coin.symbol),
          status: "no_data",
          confidence: 0,
          rejectReason: "Could not load candles",
        });
        return;
      }

      const context = buildContextFromCandles(
        coin.symbol,
        candles["15m"],
        btcCandles,
        dominance,
        sentiment?.fearGreed
      );

      const input = {
        symbol: coin.symbol,
        coinId: coin.coinId,
        candles,
        futures,
        context,
      };

      const assessment = assessFuturesIntradayCoin(input);
      assessments.push(assessment);

      const signal = evaluateFuturesIntradaySetup(input);
      if (signal) signals.push(signal);
      else rejected++;
    } catch {
      rejected++;
      assessments.push({
        symbol: coin.symbol,
        coinId: coin.coinId,
        pairLabel: formatPairLabel(coin.symbol),
        status: "no_data",
        confidence: 0,
        rejectReason: "Scan error",
      });
    }
  });

  signals.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    if (b.winProbability !== a.winProbability) return b.winProbability - a.winProbability;
    return a.riskScore - b.riskScore;
  });

  assessments.sort((a, b) => b.confidence - a.confidence);

  return { signals, assessments, scanned: coins.length, rejected };
}
