import { formatIndiaPairLabel } from "@/config/market";
import { MIN_CONFIDENCE_DEFAULT } from "@/config/api";
import { generateSignal } from "@/engines/signal-engine";
import type { Candle, Timeframe } from "@/types";
import type { IndiaFnoMetrics, OptionChainSnapshot } from "@/types/india";
import type { TradingSignal } from "@/types";

export function generateIndiaFuturesSignal(params: {
  symbol: string;
  coinId: string;
  candles: Candle[];
  timeframe: Timeframe;
  fnoMetrics?: IndiaFnoMetrics;
  minConfidence?: number;
}): TradingSignal | null {
  const longSignal = generateSignal({
    symbol: params.symbol,
    coinId: params.coinId,
    candles: params.candles,
    timeframe: params.timeframe,
    market: "india_futures",
    tradeType: "india_futures_long",
    minConfidence: params.minConfidence ?? MIN_CONFIDENCE_DEFAULT,
  });

  if (!longSignal) return null;

  longSignal.pairLabel = formatIndiaPairLabel(params.symbol);
  longSignal.currency = "INR";
  longSignal.suggestedLeverage = "Index F&O — use defined risk (SL mandatory)";

  if (params.fnoMetrics) {
    if (params.fnoMetrics.trendBias === "bullish") {
      longSignal.confirmations.push(`F&O PCR ${params.fnoMetrics.pcr.toFixed(2)} bullish`);
    }
    if (params.fnoMetrics.trendBias === "bearish") {
      longSignal.action = "STRONG SHORT";
      longSignal.tradeType = "india_futures_short";
      longSignal.confirmations.push(`F&O PCR ${params.fnoMetrics.pcr.toFixed(2)} bearish`);
    }
    longSignal.confirmations.push(`Max pain strike ₹${params.fnoMetrics.maxPainStrike}`);
  }

  return longSignal;
}

export function buildIndiaFnoMetricsFromChain(chain: OptionChainSnapshot): IndiaFnoMetrics {
  const totalCall = chain.strikes.reduce((s, r) => s + r.callOi, 0);
  const totalPut = chain.strikes.reduce((s, r) => s + r.putOi, 0);
  const pcr = totalCall > 0 ? totalPut / totalCall : 1;
  return {
    symbol: chain.underlying,
    underlyingPrice: chain.spotPrice,
    pcr,
    totalCallOi: totalCall,
    totalPutOi: totalPut,
    maxPainStrike: chain.strikes[Math.floor(chain.strikes.length / 2)]?.strike ?? chain.spotPrice,
    ivSkew: "neutral",
    trendBias: pcr > 1.05 ? "bullish" : pcr < 0.95 ? "bearish" : "neutral",
    volatilityAlert: false,
  };
}
