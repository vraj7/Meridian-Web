import type {
  Candle,
  IndicatorSnapshot,
  Timeframe,
  TradingStyle,
  TradingStyleAnalysis,
  TradingStyleScore,
} from "@/types";
import { calcADX, calcATR, calcBollinger, calcRSI, higherTimeframeBias } from "./indicators";

const STYLE_LABELS: Record<TradingStyle, string> = {
  scalping: "Scalping",
  intraday: "Intraday / Day Trading",
  swing: "Swing Trading",
  trend: "Trend Trading",
  breakout: "Breakout Trading",
  reversal: "Reversal Trading",
  range: "Range Trading",
  momentum: "Momentum Trading",
  mean_reversion: "Mean Reversion",
};

const HOLD_BY_STYLE: Record<TradingStyle, string> = {
  scalping: "Seconds to 30 minutes",
  intraday: "1–8 hours (session)",
  swing: "2–10 days",
  trend: "Days to weeks (ride the trend)",
  breakout: "4 hours to 3 days",
  reversal: "1–5 days (counter-swing)",
  range: "Minutes to 1 day (fade edges)",
  momentum: "1–48 hours",
  mean_reversion: "Hours to 2 days",
};

export interface ClassifyTradingStylesParams {
  candles: Candle[];
  indicators: IndicatorSnapshot;
  timeframe: Timeframe;
  price: number;
  isBullish: boolean;
  htfBias?: "uptrend" | "downtrend" | "ranging";
  support?: number[];
  resistance?: number[];
  patterns?: string[];
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

function atrPct(ind: IndicatorSnapshot, price: number): number {
  return price > 0 ? (ind.atr / price) * 100 : 0;
}

function vwapDeviationPct(ind: IndicatorSnapshot, price: number): number {
  return ind.vwap > 0 ? ((price - ind.vwap) / ind.vwap) * 100 : 0;
}

function bbPosition(ind: IndicatorSnapshot, price: number): number {
  const { upper, lower } = ind.bb;
  const span = upper - lower;
  if (span <= 0) return 50;
  return ((price - lower) / span) * 100;
}

function emaCrossedRecently(candles: Candle[]): boolean {
  if (candles.length < 8) return false;
  const closes = candles.map((c) => c.close);
  const ema = (vals: number[], p: number) => {
    const k = 2 / (p + 1);
    let prev = vals[0];
    const out = [prev];
    for (let i = 1; i < vals.length; i++) {
      prev = vals[i] * k + prev * (1 - k);
      out.push(prev);
    }
    return out;
  };
  const e9 = ema(closes, 9);
  const e21 = ema(closes, 21);
  for (let i = e9.length - 5; i < e9.length; i++) {
    if (i < 1) continue;
    const prevDiff = e9[i - 1] - e21[i - 1];
    const diff = e9[i] - e21[i];
    if (prevDiff <= 0 && diff > 0) return true;
    if (prevDiff >= 0 && diff < 0) return true;
  }
  return false;
}

function bbSqueezeRatio(candles: Candle[]): number {
  if (candles.length < 25) return 1;
  const closes = candles.map((c) => c.close);
  const widths: number[] = [];
  for (let i = 20; i <= closes.length; i++) {
    const slice = closes.slice(i - 20, i);
    const bb = calcBollinger(slice);
    const mid = bb.middle || 1;
    widths.push((bb.upper - bb.lower) / mid);
  }
  const current = widths[widths.length - 1] ?? 1;
  const avg = widths.reduce((a, b) => a + b, 0) / widths.length;
  return avg > 0 ? current / avg : 1;
}

function rsiDivergence(candles: Candle[], bullish: boolean): boolean {
  if (candles.length < 20) return false;
  const closes = candles.map((c) => c.close);
  const look = 12;
  const slice = closes.slice(-look);
  const rsiNow = calcRSI(closes);
  const rsiPrev = calcRSI(closes.slice(0, -3));
  const priceHH = slice[slice.length - 1] > Math.max(...slice.slice(0, -2));
  const priceLL = slice[slice.length - 1] < Math.min(...slice.slice(0, -2));
  if (bullish) return priceLL && rsiNow > rsiPrev + 4;
  return priceHH && rsiNow < rsiPrev - 4;
}

function rangeBounceScore(candles: Candle[], period = 20): number {
  if (candles.length < period) return 0;
  const slice = candles.slice(-period);
  const high = Math.max(...slice.map((c) => c.high));
  const low = Math.min(...slice.map((c) => c.low));
  const mid = (high + low) / 2;
  if (high === low) return 0;
  let crosses = 0;
  let lastSide: "above" | "below" | null = null;
  for (const c of slice) {
    const side = c.close >= mid ? "above" : "below";
    if (lastSide && side !== lastSide) crosses++;
    lastSide = side;
  }
  return clamp(crosses * 18, 0, 90);
}

function candleBodyExpansion(candles: Candle[]): number {
  if (candles.length < 6) return 0;
  const bodies = candles.slice(-6, -1).map((c) => Math.abs(c.close - c.open));
  const avg = bodies.reduce((a, b) => a + b, 0) / bodies.length;
  const last = Math.abs(candles[candles.length - 1].close - candles[candles.length - 1].open);
  if (avg <= 0) return 0;
  return clamp(((last / avg) - 1) * 50, 0, 100);
}

function adxAcceleration(candles: Candle[]): number {
  if (candles.length < 30) return 0;
  const adxNow = calcADX(candles);
  const adxPrev = calcADX(candles.slice(0, -5));
  const delta = adxNow - adxPrev;
  return clamp(delta * 8, 0, 100);
}

function scoreScalping(p: ClassifyTradingStylesParams): TradingStyleScore {
  const { indicators: ind, timeframe, candles, price } = p;
  const reasons: string[] = [];
  let score = 0;
  const atr = atrPct(ind, price);

  if (timeframe === "1m" || timeframe === "5m") {
    score += 28;
    reasons.push("Low timeframe — suited for quick in/out");
  }
  if (ind.volumeSpike >= 1.7) {
    score += 22;
    reasons.push("Volume spike — momentum burst");
  }
  if (atr > 0 && atr < 1.4) {
    score += 18;
    reasons.push("Tight ATR — controlled stop distance");
  }
  if (emaCrossedRecently(candles)) {
    score += 20;
    reasons.push("Fresh EMA 9/21 cross");
  }
  if (ind.adx >= 16 && ind.adx <= 38) {
    score += 12;
    reasons.push("Active but not exhausted trend");
  }

  return { style: "scalping", label: STYLE_LABELS.scalping, score: clamp(score), reasons };
}

function scoreIntraday(p: ClassifyTradingStylesParams): TradingStyleScore {
  const { indicators: ind, timeframe, price, isBullish, htfBias } = p;
  const reasons: string[] = [];
  let score = 0;

  if (timeframe === "15m" || timeframe === "1h") {
    score += 26;
    reasons.push("Intraday timeframe");
  }
  if (
    (isBullish && ind.trend === "bullish") ||
    (!isBullish && ind.trend === "bearish")
  ) {
    score += 22;
    reasons.push("Trend continuation on chart TF");
  }
  const vwapDev = Math.abs(vwapDeviationPct(ind, price));
  if (vwapDev < 0.45) {
    score += 18;
    reasons.push("Price interacting with VWAP");
  } else if (vwapDev < 0.9) {
    score += 10;
    reasons.push("Near VWAP — session mean anchor");
  }
  if (ind.volumeSpike >= 1.25) {
    score += 14;
    reasons.push("Session momentum — volume elevated");
  }
  if (htfBias && htfBias !== "ranging") {
    score += 12;
    reasons.push(`HTF ${htfBias} supports session bias`);
  }
  if (p.patterns?.some((x) => x.includes("Continuation"))) {
    score += 12;
    reasons.push("Breakout retest / continuation candle");
  }

  return { style: "intraday", label: STYLE_LABELS.intraday, score: clamp(score), reasons };
}

function scoreSwing(p: ClassifyTradingStylesParams): TradingStyleScore {
  const { indicators: ind, timeframe, price, isBullish, htfBias, support, resistance } = p;
  const reasons: string[] = [];
  let score = 0;

  if (timeframe === "4h" || timeframe === "1D" || timeframe === "1W") {
    score += 30;
    reasons.push("Higher timeframe — multi-day structure");
  }
  if (htfBias === "uptrend" || htfBias === "downtrend") {
    score += 24;
    reasons.push("Higher-TF trend defined");
  }
  const sup = support?.[0];
  const res = resistance?.[0];
  if (isBullish && sup && price <= sup * 1.015) {
    score += 20;
    reasons.push("Reaction at support");
  }
  if (!isBullish && res && price >= res * 0.985) {
    score += 20;
    reasons.push("Reaction at resistance");
  }
  if (ind.adx >= 20) {
    score += 14;
    reasons.push("Trend strong enough for swing hold");
  }
  if (ind.ema21 > ind.ema50 || ind.ema21 < ind.ema50) {
    score += 12;
    reasons.push("Multi-day EMA structure");
  }

  return { style: "swing", label: STYLE_LABELS.swing, score: clamp(score), reasons };
}

function scoreTrend(p: ClassifyTradingStylesParams): TradingStyleScore {
  const { indicators: ind, htfBias, isBullish } = p;
  const reasons: string[] = [];
  let score = 0;

  if (ind.adx >= 28) {
    score += 28;
    reasons.push(`Strong ADX (${ind.adx.toFixed(0)}) — trending market`);
  }
  if (
    (isBullish && ind.ema9 > ind.ema21 && ind.ema21 > ind.ema50) ||
    (!isBullish && ind.ema9 < ind.ema21 && ind.ema21 < ind.ema50)
  ) {
    score += 26;
    reasons.push("EMA stack aligned with trade direction");
  }
  if (htfBias === (isBullish ? "uptrend" : "downtrend")) {
    score += 22;
    reasons.push("HTF trend agrees");
  }
  if (ind.trendStrength >= 35) {
    score += 14;
    reasons.push("Trend acceleration / separation");
  }
  if (Math.sign(ind.macd.histogram) === (isBullish ? 1 : -1)) {
    score += 10;
    reasons.push("MACD momentum in trend direction");
  }

  return { style: "trend", label: STYLE_LABELS.trend, score: clamp(score), reasons };
}

function scoreBreakout(p: ClassifyTradingStylesParams): TradingStyleScore {
  const { indicators: ind, candles, price } = p;
  const reasons: string[] = [];
  let score = 0;
  const squeeze = bbSqueezeRatio(candles);

  if (squeeze < 0.78) {
    score += 28;
    reasons.push("Volatility squeeze / range compression");
  }
  if (ind.volumeSpike >= 1.55) {
    score += 24;
    reasons.push("Breakout volume confirmation");
  }
  const rp = ind.rangePosition;
  if (rp >= 88 || rp <= 12) {
    score += 22;
    reasons.push("Close at range extreme — breakout zone");
  }
  const body = candleBodyExpansion(candles);
  if (body >= 40) {
    score += 16;
    reasons.push("Expansion candle — impulse move");
  }
  const atr = atrPct(ind, price);
  if (atr >= 1.2 && atr <= 4.5) {
    score += 10;
    reasons.push("Volatility expanding from base");
  }

  return { style: "breakout", label: STYLE_LABELS.breakout, score: clamp(score), reasons };
}

function scoreReversal(p: ClassifyTradingStylesParams): TradingStyleScore {
  const { indicators: ind, candles, isBullish, patterns } = p;
  const reasons: string[] = [];
  let score = 0;

  if ((isBullish && ind.rsi < 38) || (!isBullish && ind.rsi > 62)) {
    score += 26;
    reasons.push(`RSI stretch (${ind.rsi.toFixed(0)})`);
  }
  if (rsiDivergence(candles, isBullish)) {
    score += 24;
    reasons.push("RSI divergence vs price");
  }
  if (patterns?.some((x) => x.includes("Engulfing") || x === "Doji")) {
    score += 18;
    reasons.push("Exhaustion / reversal candle pattern");
  }
  if (ind.stochRsi < 22 || ind.stochRsi > 78) {
    score += 14;
    reasons.push("Stoch RSI at extreme");
  }
  const rp = ind.rangePosition;
  if ((isBullish && rp < 22) || (!isBullish && rp > 78)) {
    score += 18;
    reasons.push("Oversold / overbought range position");
  }

  return { style: "reversal", label: STYLE_LABELS.reversal, score: clamp(score), reasons };
}

function scoreRange(p: ClassifyTradingStylesParams): TradingStyleScore {
  const { indicators: ind, candles, support, resistance, price } = p;
  const reasons: string[] = [];
  let score = 0;

  if (ind.adx < 22) {
    score += 30;
    reasons.push(`Low ADX (${ind.adx.toFixed(0)}) — non-trending`);
  }
  const bounces = rangeBounceScore(candles);
  if (bounces >= 36) {
    score += 24;
    reasons.push("Repeated mid-range oscillation");
  }
  const sup = support?.[0];
  const res = resistance?.[0];
  if (sup && res && res > sup) {
    const widthPct = ((res - sup) / price) * 100;
    if (widthPct >= 1.5 && widthPct <= 8) {
      score += 22;
      reasons.push("Defined horizontal range");
    }
  }
  if (ind.rangePosition > 35 && ind.rangePosition < 65) {
    score += 16;
    reasons.push("Price mid-range — fade edges");
  }

  return { style: "range", label: STYLE_LABELS.range, score: clamp(score), reasons };
}

function scoreMomentum(p: ClassifyTradingStylesParams): TradingStyleScore {
  const { indicators: ind, candles } = p;
  const reasons: string[] = [];
  let score = 0;

  if (ind.volumeSpike >= 1.45) {
    score += 26;
    reasons.push("Volume surge");
  }
  const body = candleBodyExpansion(candles);
  if (body >= 35) {
    score += 24;
    reasons.push("Strong candle expansion");
  }
  const adxAcc = adxAcceleration(candles);
  if (adxAcc >= 25) {
    score += 20;
    reasons.push("ADX rising — trend acceleration");
  }
  if (Math.abs(ind.macd.histogram) > 0 && ind.adx >= 22) {
    score += 16;
    reasons.push("MACD impulse with trend strength");
  }
  if (ind.trendStrength >= 30) {
    score += 14;
    reasons.push("EMA separation increasing");
  }

  return { style: "momentum", label: STYLE_LABELS.momentum, score: clamp(score), reasons };
}

function scoreMeanReversion(p: ClassifyTradingStylesParams): TradingStyleScore {
  const { indicators: ind, price } = p;
  const reasons: string[] = [];
  let score = 0;
  const bbPos = bbPosition(ind, price);
  const vwapDev = Math.abs(vwapDeviationPct(ind, price));

  if (bbPos >= 98 || bbPos <= 2) {
    score += 28;
    reasons.push("Price at Bollinger Band extreme");
  } else if (bbPos >= 92 || bbPos <= 8) {
    score += 18;
    reasons.push("Near Bollinger Band edge");
  }
  if (vwapDev >= 0.75) {
    score += 24;
    reasons.push(`Stretched from VWAP (${vwapDev.toFixed(2)}%)`);
  }
  if (ind.rsi > 68 || ind.rsi < 32) {
    score += 18;
    reasons.push("RSI mean-reversion setup");
  }
  if (ind.adx < 26) {
    score += 14;
    reasons.push("No strong trend — favor reversion");
  }
  if (ind.ema9 && price) {
    const emaDev = Math.abs((price - ind.ema21) / ind.ema21) * 100;
    if (emaDev >= 1.2) {
      score += 16;
      reasons.push("Extended from EMA mean");
    }
  }

  return {
    style: "mean_reversion",
    label: STYLE_LABELS.mean_reversion,
    score: clamp(score),
    reasons,
  };
}

const SCORERS = [
  scoreScalping,
  scoreIntraday,
  scoreSwing,
  scoreTrend,
  scoreBreakout,
  scoreReversal,
  scoreRange,
  scoreMomentum,
  scoreMeanReversion,
] as const;

/** Classify which trading style best matches the current setup. */
export function classifyTradingStyles(
  params: ClassifyTradingStylesParams
): TradingStyleAnalysis {
  const scores = SCORERS.map((fn) => fn(params)).sort((a, b) => b.score - a.score);
  const primary = scores[0]!;
  const secondary =
    scores[1] && scores[1].score >= primary.score - 12 && scores[1].score >= 40
      ? scores[1]
      : undefined;

  const summary = secondary
    ? `${primary.label} (${primary.score}%) with ${secondary.label} undertones (${secondary.score}%)`
    : `${primary.label} setup (${primary.score}% style match)`;

  return {
    primary: primary.style,
    primaryLabel: primary.label,
    primaryScore: primary.score,
    secondary: secondary?.style,
    secondaryLabel: secondary?.label,
    secondaryScore: secondary?.score,
    scores,
    summary,
    suggestedHold: HOLD_BY_STYLE[primary.style],
  };
}

export function tradingStyleToTradeType(
  style: TradingStyle,
  market: "spot" | "futures"
): "spot" | "scalp" | "swing" | "breakout" | "reversal" | "futures_long" | "futures_short" {
  if (market === "futures") return "futures_long";
  switch (style) {
    case "scalping":
      return "scalp";
    case "swing":
    case "trend":
      return "swing";
    case "breakout":
    case "momentum":
      return "breakout";
    case "reversal":
    case "mean_reversion":
      return "reversal";
    case "intraday":
    case "range":
    default:
      return "spot";
  }
}

export { STYLE_LABELS, HOLD_BY_STYLE };
