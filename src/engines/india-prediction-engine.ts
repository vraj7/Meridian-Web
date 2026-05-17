import { formatIndiaPairLabel } from "@/config/market";
import { generateSignal } from "@/engines/signal-engine";
import { computeIndicators, findSupportResistance, calcFibonacci } from "@/engines/indicators";
import { analyzeOptionChain } from "@/engines/india-options-engine";
import type { Candle, Timeframe } from "@/types";
import type { IndiaPredictionResult, OptionChainSnapshot } from "@/types/india";

export function runIndiaPrediction(params: {
  symbol: string;
  stockId: string;
  candles: Candle[];
  timeframe: Timeframe;
  market: "india_equity" | "india_futures" | "india_options";
  optionChain?: OptionChainSnapshot | null;
  minConfidence?: number;
}): IndiaPredictionResult {
  const indicators = computeIndicators(params.candles);
  const { support, resistance } = findSupportResistance(params.candles);
  calcFibonacci(params.candles);

  let optionSignals: IndiaPredictionResult["optionSignals"] = [];
  let fnoMetrics: IndiaPredictionResult["fnoMetrics"];

  if (params.optionChain) {
    const analysis = analyzeOptionChain(params.optionChain, params.minConfidence);
    optionSignals = analysis.signals;
    fnoMetrics = analysis.metrics;
  }

  const tradeType =
    params.market === "india_futures"
      ? "india_futures_long"
      : params.market === "india_options"
        ? "india_options"
        : "india_cash";

  const signal = generateSignal({
    symbol: params.symbol,
    coinId: params.stockId,
    candles: params.candles,
    timeframe: params.timeframe,
    market: params.market === "india_equity" ? "india_equity" : "india_futures",
    tradeType,
    minConfidence: params.minConfidence,
  });

  if (signal) {
    signal.pairLabel = formatIndiaPairLabel(params.symbol);
    signal.currency = "INR";
    if (params.market === "india_equity") {
      signal.suggestedLeverage = "Cash & carry / MIS (no leverage advice)";
    }
  }

  const parts = [
    `${params.symbol} (${formatIndiaPairLabel(params.symbol)}) structure: ${indicators.trend} with ${indicators.trendStrength.toFixed(0)}% strength.`,
    `RSI ${indicators.rsi.toFixed(1)}.`,
  ];
  if (fnoMetrics) {
    parts.push(`PCR ${fnoMetrics.pcr.toFixed(2)}, max pain ₹${fnoMetrics.maxPainStrike}. F&O bias: ${fnoMetrics.trendBias}.`);
  }
  if (!signal && optionSignals.length === 0) {
    parts.push("No high-confidence cash or derivatives setup — wait for confirmation.");
  }
  parts.push("NSE F&O involves substantial risk. Educational analysis only.");

  return {
    signal,
    optionSignals,
    fnoMetrics,
    indicators,
    support,
    resistance,
    commentary: parts.join(" "),
    candles: params.candles,
  };
}
