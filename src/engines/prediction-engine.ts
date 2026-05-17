import type { CryptoQuotePair } from "@/config/market";
import type { Candle, FuturesMetrics, PredictionResult, SentimentData, Timeframe } from "@/types";
import { calcFibonacci, computeIndicators, findSupportResistance } from "./indicators";
import { generateSignal } from "./signal-engine";

export async function runPrediction(params: {
  symbol: string;
  coinId: string;
  candles: Candle[];
  higherTimeframeCandles?: Candle[];
  timeframe: Timeframe;
  market: "spot" | "futures";
  sentiment?: SentimentData;
  futures?: FuturesMetrics;
  minConfidence?: number;
  minConfirmations?: number;
  minRiskReward?: number;
  relaxed?: boolean;
  quotePair?: CryptoQuotePair;
}): Promise<PredictionResult> {
  const indicators = computeIndicators(params.candles);
  const { support, resistance } = findSupportResistance(params.candles);
  const fibLevels = calcFibonacci(params.candles);

  const longSignal = generateSignal({
    ...params,
    tradeType: params.market === "futures" ? "futures_long" : "spot",
  });

  const shortSignal =
    params.market === "futures"
      ? generateSignal({
          ...params,
          tradeType: "futures_short",
        })
      : null;

  const preferShort =
    params.market === "futures" &&
    shortSignal !== null &&
    shortSignal.confidence > (longSignal?.confidence ?? 0);
  const chosen = preferShort ? shortSignal : longSignal;

  // Prefer the new contextual commentary from the trade-quality engine.
  const commentary =
    chosen?.aiCommentary ?? buildCommentary(indicators, params.sentiment, chosen !== null);

  return {
    signal: chosen,
    indicators,
    support,
    resistance,
    fibLevels,
    commentary,
    candles: params.candles,
  };
}

function buildCommentary(
  ind: ReturnType<typeof computeIndicators>,
  sentiment?: SentimentData,
  hasSignal?: boolean
): string {
  const parts: string[] = [];

  parts.push(
    `Market structure is ${ind.trend} with ${ind.trendStrength.toFixed(0)}% trend strength.`
  );
  parts.push(`RSI at ${ind.rsi.toFixed(1)} (${ind.rsi < 30 ? "oversold" : ind.rsi > 70 ? "overbought" : "neutral"}).`);

  if (sentiment) {
    parts.push(
      `Fear & Greed: ${sentiment.fearGreed} (${sentiment.fearGreedLabel}). Sentiment score: ${(sentiment.overall * 100).toFixed(0)}.`
    );
  }

  if (!hasSignal) {
    parts.push("No high-confidence setup detected. Capital preservation mode — wait for multi-confirmation.");
  } else {
    parts.push("Multi-indicator confirmation met. Review risk parameters before acting.");
  }

  return parts.join(" ");
}

export function generateMarketCommentary(
  btcChange: number,
  dominance: number,
  fearGreed: number,
  signalCount: number
): string {
  const bias =
    btcChange > 1 ? "risk-on" : btcChange < -1 ? "risk-off" : "range-bound";
  return `Market is ${bias}. BTC dominance at ${dominance.toFixed(1)}%. Fear & Greed: ${fearGreed}. ${signalCount} high-confidence signals active. Probabilistic analysis only — not financial advice.`;
}
