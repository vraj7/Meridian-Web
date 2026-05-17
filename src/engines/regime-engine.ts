import type { Candle } from "@/types";
import type { IndiaNewsSentiment } from "@/types/india";
import type { MarketRegime } from "@/types/india-advanced";
import { computeIndicators } from "./indicators";

export function detectMarketRegime(params: {
  indexCandles: Candle[];
  news: IndiaNewsSentiment;
  pcr?: number;
}): { regime: MarketRegime; label: string; strategyNote: string } {
  const { indexCandles, news, pcr } = params;
  if (indexCandles.length < 30) {
    return {
      regime: "sideways",
      label: "Sideways / unclear",
      strategyNote: "Wait for clearer index structure",
    };
  }

  const ind = computeIndicators(indexCandles);
  const closes = indexCandles.map((c) => c.close);
  const price = closes[closes.length - 1];
  const atrPct = (ind.atr / price) * 100;

  let regime: MarketRegime = "sideways";

  if (atrPct > 2.5) regime = "high_volatility";
  if (news.overall < -0.35 && ind.trend === "bearish") regime = "panic";
  if (ind.trend === "bullish" && ind.ema9 > ind.ema21) regime = "trending_up";
  if (ind.trend === "bearish" && ind.ema9 < ind.ema21) regime = "trending_down";

  if (pcr !== undefined) {
    if (pcr > 1.2 && ind.rsi > 55 && regime === "trending_down") regime = "short_covering";
    if (pcr < 0.85 && ind.rsi < 45 && regime === "trending_up") regime = "bear_trap";
    if (ind.rsi > 70 && regime === "trending_up" && news.overall < 0) regime = "bull_trap";
  }

  const labels: Record<MarketRegime, string> = {
    trending_up: "Trending up",
    trending_down: "Trending down",
    sideways: "Sideways / range",
    high_volatility: "High volatility",
    panic: "Panic / risk-off",
    short_covering: "Short covering rally",
    bull_trap: "Bull trap risk",
    bear_trap: "Bear trap / squeeze",
  };

  const notes: Record<MarketRegime, string> = {
    trending_up: "Favor buy-on-dip; avoid naked PE shorts",
    trending_down: "Raise cash; selective hedges",
    sideways: "Sell premium / mean-reversion; avoid breakouts",
    high_volatility: "Reduce size; widen stops",
    panic: "Capital preservation; wait for stabilization",
    short_covering: "Don't chase; confirm trend change",
    bull_trap: "Wait for pullback confirmation",
    bear_trap: "Cover shorts carefully; confirm reversal",
  };

  return { regime, label: labels[regime], strategyNote: notes[regime] };
}
