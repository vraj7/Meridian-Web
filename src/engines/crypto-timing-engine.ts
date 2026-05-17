import type { Candle, CryptoMarketRegime, IndicatorSnapshot, SignalQuality, Timeframe } from "@/types";
import { higherTimeframeBias } from "./indicators";

/** Map low-TF charting to a higher reference TF for trend confirmation. */
export const HIGHER_TIMEFRAME: Record<Timeframe, Timeframe> = {
  "1m": "15m",
  "5m": "1h",
  "15m": "4h",
  "1h": "1D",
  "4h": "1D",
  "1D": "1W",
  "1W": "1W",
};

/** Beginner-friendly label for what the timeframe is good for. */
export function timeframeStyleLabel(tf: Timeframe): string {
  switch (tf) {
    case "1m":
    case "5m":
      return "Scalp · seconds-to-minutes hold";
    case "15m":
      return "Intraday · 1–4 hours hold";
    case "1h":
      return "Intraday / short swing · 4–24 hours hold";
    case "4h":
      return "Swing · 1–4 days hold";
    case "1D":
      return "Position · 1–3 weeks hold";
    case "1W":
      return "Long-term · weeks-to-months hold";
  }
}

export function detectCryptoRegime(
  ind: IndicatorSnapshot,
  price: number,
  htfBias: ReturnType<typeof higherTimeframeBias>
): { regime: CryptoMarketRegime; label: string; note: string } {
  const atrPct = (ind.atr / price) * 100;

  if (atrPct > 6) {
    return {
      regime: "high_volatility",
      label: "High volatility",
      note: "Wider stops, smaller size, avoid leverage spikes.",
    };
  }
  if (ind.adx < 18) {
    return {
      regime: "ranging",
      label: "Sideways / range",
      note: "Trend signals weak — fade extremes, avoid breakouts.",
    };
  }

  const bullishStack = ind.ema9 > ind.ema21 && ind.ema21 > ind.ema50 && price > ind.ema21;
  const bearishStack = ind.ema9 < ind.ema21 && ind.ema21 < ind.ema50 && price < ind.ema21;

  if (htfBias === "uptrend" && bullishStack && ind.adx >= 25) {
    return {
      regime: "strong_uptrend",
      label: "Strong uptrend",
      note: "Trend-following longs preferred; buy pullbacks to EMA21.",
    };
  }
  if (htfBias === "downtrend" && bearishStack && ind.adx >= 25) {
    return {
      regime: "strong_downtrend",
      label: "Strong downtrend",
      note: "Trend-following shorts preferred; sell rallies to EMA21.",
    };
  }
  if (htfBias === "uptrend" && (price < ind.ema9 || ind.rsi < 45)) {
    return {
      regime: "pullback_in_uptrend",
      label: "Pullback in uptrend",
      note: "Higher-TF bullish — wait for bounce off support to enter longs.",
    };
  }
  if (htfBias === "downtrend" && (price > ind.ema9 || ind.rsi > 55)) {
    return {
      regime: "pullback_in_downtrend",
      label: "Bounce in downtrend",
      note: "Higher-TF bearish — wait for rejection at resistance to enter shorts.",
    };
  }
  if (price > ind.bb.upper && ind.volumeSpike > 1.6) {
    return {
      regime: "breakout",
      label: "Breakout (above range)",
      note: "Confirmed by volume — chase only on retest, not first impulse.",
    };
  }
  if (price < ind.bb.lower && ind.volumeSpike > 1.6) {
    return {
      regime: "breakdown",
      label: "Breakdown (below range)",
      note: "Confirmed by volume — short on retest of broken support.",
    };
  }

  return { regime: "ranging", label: "Mixed / unclear", note: "Wait for clearer setup." };
}

/** Return a 24h-cycle hint for liquid crypto trading windows. */
export function getCryptoEntryWindow(): {
  label: string;
  inWindow: boolean;
  detail: string;
} {
  const utc = new Date();
  const hour = utc.getUTCHours();

  // Asia 00–07, EU 07–13, US 13–21 UTC. US/EU overlap = highest liquidity.
  if (hour >= 7 && hour < 9) {
    return {
      label: "Europe open · 07:00–09:00 UTC",
      inWindow: true,
      detail: "EU open — directional moves often start here.",
    };
  }
  if (hour >= 13 && hour < 17) {
    return {
      label: "US/EU overlap · 13:00–17:00 UTC",
      inWindow: true,
      detail: "Highest liquidity — best window for breakouts and momentum.",
    };
  }
  if (hour >= 21 || hour < 1) {
    return {
      label: "Late US / Asia roll · 21:00–01:00 UTC",
      inWindow: false,
      detail: "Thinner liquidity — fakeouts more common, prefer waiting.",
    };
  }
  if (hour >= 1 && hour < 7) {
    return {
      label: "Asia session · 01:00–07:00 UTC",
      inWindow: true,
      detail: "Asian flow — good for ranges; directional moves often fade in EU open.",
    };
  }
  return {
    label: "Mid-session lull",
    inWindow: false,
    detail: "Slower hours — wait for next major session for higher conviction.",
  };
}

/** Translate score + multi-confirmation into A/B/C grade. */
export function gradeSignal(params: {
  confidence: number;
  confirmations: number;
  regime: CryptoMarketRegime;
  htfAligned: boolean;
  riskReward: number;
  volumeConfirmed: boolean;
  warningsCount: number;
}): SignalQuality {
  const { confidence, confirmations, regime, htfAligned, riskReward, volumeConfirmed, warningsCount } = params;

  let score = 0;
  if (confidence >= 78) score += 3;
  else if (confidence >= 68) score += 2;
  else if (confidence >= 60) score += 1;

  if (confirmations >= 5) score += 2;
  else if (confirmations >= 3) score += 1;

  if (htfAligned) score += 2;
  if (volumeConfirmed) score += 1;
  if (riskReward >= 2.5) score += 2;
  else if (riskReward >= 1.8) score += 1;

  if (regime === "strong_uptrend" || regime === "strong_downtrend") score += 1;
  if (regime === "ranging" || regime === "high_volatility") score -= 1;

  score -= Math.min(2, warningsCount);

  if (score >= 8) return "A";
  if (score >= 5) return "B";
  return "C";
}

export function estimateWinProbability(quality: SignalQuality, riskReward: number): number {
  const base = quality === "A" ? 62 : quality === "B" ? 54 : 44;
  const rrAdj = Math.min(8, Math.max(-8, (riskReward - 2) * 4));
  return Math.round(Math.max(35, Math.min(78, base + rrAdj)));
}

/** Higher-TF candles confirm same direction as low-TF signal. */
export function isHtfAligned(
  htfCandles: Candle[] | undefined,
  isBullish: boolean
): boolean {
  if (!htfCandles || htfCandles.length < 50) return false;
  const bias = higherTimeframeBias(htfCandles);
  if (isBullish) return bias === "uptrend";
  return bias === "downtrend";
}

/** Build plain-English BUY reasons. */
export function buildWhyBuy(ind: IndicatorSnapshot, regime: CryptoMarketRegime, htfAligned: boolean): string[] {
  const reasons: string[] = [];
  if (regime === "strong_uptrend") {
    reasons.push("Strong uptrend confirmed by ADX and EMA stack — momentum on your side.");
  } else if (regime === "pullback_in_uptrend") {
    reasons.push("Higher-TF is bullish and price has pulled back — better risk/reward to enter long.");
  } else if (regime === "breakout") {
    reasons.push("Price broke above range with volume — buyers are stepping in.");
  }
  if (htfAligned) reasons.push("Higher timeframe trend agrees — fewer false signals.");
  if (ind.rsi < 35) reasons.push("RSI is oversold — bounce odds are higher than usual.");
  if (ind.macd.histogram > 0) reasons.push("MACD turned positive — momentum shifting up.");
  if (ind.volumeSpike > 1.5) reasons.push(`Volume is ${ind.volumeSpike.toFixed(1)}× the average — real interest, not noise.`);
  if (ind.rangePosition < 35) reasons.push("Price near lower part of recent range — favorable spot to buy.");
  return reasons;
}

export function buildWhySell(ind: IndicatorSnapshot, regime: CryptoMarketRegime, htfAligned: boolean): string[] {
  const reasons: string[] = [];
  if (regime === "strong_downtrend") {
    reasons.push("Strong downtrend with ADX > 25 — sellers in control.");
  } else if (regime === "pullback_in_downtrend") {
    reasons.push("Higher-TF is bearish and price bounced — short the rally with better R:R.");
  } else if (regime === "breakdown") {
    reasons.push("Price broke below range with volume — sellers are aggressive.");
  }
  if (htfAligned) reasons.push("Higher timeframe trend agrees — fewer false signals.");
  if (ind.rsi > 65) reasons.push("RSI overbought — pullback odds are higher.");
  if (ind.macd.histogram < 0) reasons.push("MACD turned negative — momentum fading.");
  if (ind.volumeSpike > 1.5) reasons.push(`Volume ${ind.volumeSpike.toFixed(1)}× average — distribution showing.`);
  if (ind.rangePosition > 65) reasons.push("Price near upper part of recent range — risky to chase longs.");
  return reasons;
}

/** What invalidates the trade (clear, simple). */
export function buildInvalidation(isBullish: boolean, ind: IndicatorSnapshot, stopLoss: number): string[] {
  const list: string[] = [];
  list.push(
    isBullish
      ? `Close below stop ${stopLoss.toFixed(2)} on the same timeframe — exit immediately.`
      : `Close above stop ${stopLoss.toFixed(2)} on the same timeframe — exit immediately.`
  );
  if (isBullish) {
    list.push("EMA9 crosses below EMA21 with rising volume — trend break.");
    if (ind.adx >= 25) list.push("ADX falls below 18 — trend losing strength, tighten stop.");
  } else {
    list.push("EMA9 crosses above EMA21 with rising volume — trend break.");
    if (ind.adx >= 25) list.push("ADX falls below 18 — trend losing strength, cover quickly.");
  }
  return list;
}

/** Friendly one-line summary the user instantly understands. */
export type TrendLabel = "Uptrend" | "Downtrend" | "Sideways";

/** Slower EMA stack — macro structure on the chart timeframe. */
export function trendFromIndicators(ind: IndicatorSnapshot): TrendLabel {
  if (ind.trend === "bullish") return "Uptrend";
  if (ind.trend === "bearish") return "Downtrend";
  if (ind.ema9 > ind.ema21) return "Uptrend";
  if (ind.ema9 < ind.ema21) return "Downtrend";
  return "Sideways";
}

/** Simple least-squares slope of `values` on x = [0..n-1]. */
function linearRegressionSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

/** Number of bars roughly matching what fits on the visible chart for a TF. */
function visibleChartBars(timeframe: Timeframe): number {
  switch (timeframe) {
    case "1m":
      return 40;
    case "5m":
      return 35;
    case "15m":
      return 30;
    case "1h":
      return 30;
    case "4h":
      return 25;
    case "1D":
      return 25;
    case "1W":
      return 20;
    default:
      return 30;
  }
}

/**
 * Realistic per-timeframe noise floor for crypto — moves under this read as
 * sideways even if they're directional, so a 0.5% drift on 15m doesn't get
 * called a "Downtrend".
 */
function trendNoiseFloorPct(timeframe: Timeframe): number {
  switch (timeframe) {
    case "1m":
      return 0.15;
    case "5m":
      return 0.25;
    case "15m":
      return 0.4;
    case "1h":
      return 0.6;
    case "4h":
      return 1.0;
    case "1D":
      return 2.0;
    case "1W":
      return 4.0;
    default:
      return 0.5;
  }
}

/**
 * Mirrors what the user sees on the chart: looks at the entire visible window
 * (not just the last 4-8 bars), measures the dominant direction with both
 * endpoint comparison and a regression slope, and only calls a trend when the
 * move clears a crypto-realistic noise floor for that timeframe.
 *
 * Returning "Sideways" must mean: small net move AND no consistent slope —
 * which is what a human looking at flat chop would say.
 */
export function recentChartTrend(candles: Candle[], timeframe: Timeframe): TrendLabel {
  if (candles.length < 8) return "Sideways";

  const noise = trendNoiseFloorPct(timeframe);
  const n = Math.min(visibleChartBars(timeframe), candles.length);
  const window = candles.slice(-n);
  const closes = window.map((c) => c.close);

  const headSize = Math.max(3, Math.floor(n * 0.2));
  const tailSize = Math.max(3, Math.floor(n * 0.2));
  const headAvg = closes.slice(0, headSize).reduce((a, b) => a + b, 0) / headSize;
  const tailAvg = closes.slice(-tailSize).reduce((a, b) => a + b, 0) / tailSize;
  if (headAvg <= 0) return "Sideways";

  const netChangePct = ((tailAvg - headAvg) / headAvg) * 100;

  const slope = linearRegressionSlope(closes);
  const slopePerBarPct = (slope / headAvg) * 100;
  const slopeOverWindowPct = slopePerBarPct * n;

  const swingHigh = Math.max(...window.map((c) => c.high));
  const swingLow = Math.min(...window.map((c) => c.low));
  const rangePct = swingLow > 0 ? ((swingHigh - swingLow) / swingLow) * 100 : 0;

  const micro = candles.slice(-Math.min(4, candles.length));
  const microPct =
    micro[0].close > 0
      ? ((micro[micro.length - 1].close - micro[0].close) / micro[0].close) * 100
      : 0;

  const netThreshold = noise * 1.5;
  const slopeThreshold = noise * 0.6;
  const tightRange = rangePct < noise * 2;

  if (
    tightRange &&
    Math.abs(netChangePct) < noise &&
    Math.abs(slopeOverWindowPct) < noise
  ) {
    return "Sideways";
  }

  const rising = netChangePct >= netThreshold && slopeOverWindowPct >= slopeThreshold;
  const falling =
    netChangePct <= -netThreshold && slopeOverWindowPct <= -slopeThreshold;

  if (rising && !falling) return "Uptrend";
  if (falling && !rising) return "Downtrend";

  if (
    !rising &&
    !falling &&
    Math.abs(microPct) >= noise * 1.5 &&
    Math.sign(microPct) === Math.sign(slopeOverWindowPct || microPct)
  ) {
    return microPct > 0 ? "Uptrend" : "Downtrend";
  }

  return "Sideways";
}

function buildTrendDetail(
  chartTrend: TrendLabel,
  higherTfTrend: TrendLabel,
  overallTrend: TrendLabel,
  timeframe: Timeframe,
  higherTf: Timeframe
): string {
  if (chartTrend === higherTfTrend && chartTrend === "Sideways") {
    return `Both ${timeframe} and ${higherTf} are sideways — wait for a clear breakout.`;
  }
  if (chartTrend === higherTfTrend) {
    return `Aligned — ${timeframe} and ${higherTf} are both ${chartTrend.toLowerCase()}. ${
      chartTrend === "Uptrend"
        ? "Favor longs / buy dips."
        : "Favor shorts / sell rallies."
    }`;
  }
  if (chartTrend === "Sideways") {
    return `${timeframe} is sideways but ${higherTf} is ${higherTfTrend.toLowerCase()} — bias from the bigger timeframe still applies.`;
  }
  if (higherTfTrend === "Sideways") {
    return `${timeframe} shows ${chartTrend.toLowerCase()} but ${higherTf} is sideways — short-term move, no broader trend yet.`;
  }
  return `Mixed — ${timeframe} is ${chartTrend.toLowerCase()} but ${higherTf} is ${higherTfTrend.toLowerCase()}. Overall: ${overallTrend.toLowerCase()} — wait for both to agree before a big position.`;
}

function combineOverallTrend(
  chartTrend: TrendLabel,
  higherTfTrend: TrendLabel,
  adx: number
): TrendLabel {
  if (chartTrend === higherTfTrend && chartTrend !== "Sideways") return chartTrend;
  if (chartTrend === "Sideways" && higherTfTrend !== "Sideways" && adx >= 18) {
    return higherTfTrend;
  }
  if (higherTfTrend === "Sideways" && chartTrend !== "Sideways" && adx >= 22) {
    return chartTrend;
  }
  return "Sideways";
}

/** Recompute chart-trend labels from the same candles shown on the price chart. */
export function resolveChartTrendFromCandles(params: {
  candles: Candle[];
  timeframe: Timeframe;
  higherTf: Timeframe;
  higherTfTrend: TrendLabel;
  indicators: IndicatorSnapshot;
}): Pick<
  ReturnType<typeof resolveMarketTrend>,
  "chartTrend" | "trendDetail" | "trendSummary" | "overallTrend"
> {
  const { candles, timeframe, higherTf, higherTfTrend, indicators } = params;
  const chartTrend = recentChartTrend(candles, timeframe);
  const overallTrend = combineOverallTrend(chartTrend, higherTfTrend, indicators.adx);
  const trendSummary = `Chart (${timeframe}): ${chartTrend} · Higher TF (${higherTf}): ${higherTfTrend} · Overall: ${overallTrend}`;
  const trendDetail = buildTrendDetail(
    chartTrend,
    higherTfTrend,
    overallTrend,
    timeframe,
    higherTf
  );
  return { chartTrend, trendDetail, trendSummary, overallTrend };
}

export function trendFromHtfBias(htf: ReturnType<typeof higherTimeframeBias>): TrendLabel {
  if (htf === "uptrend") return "Uptrend";
  if (htf === "downtrend") return "Downtrend";
  return "Sideways";
}

/** Chart TF + higher TF → overall trend label and beginner-friendly text. */
export function resolveMarketTrend(params: {
  indicators: IndicatorSnapshot;
  htfBias: ReturnType<typeof higherTimeframeBias>;
  timeframe: Timeframe;
  higherTf: Timeframe;
  /** Chart candles for the active timeframe — drives the visible chart-trend pill. */
  candles?: Candle[];
}): {
  chartTrend: TrendLabel;
  higherTfTrend: TrendLabel;
  overallTrend: TrendLabel;
  trendSummary: string;
  trendDetail: string;
} {
  const { indicators, htfBias, timeframe, higherTf, candles } = params;
  const chartTrend =
    candles && candles.length >= 8
      ? recentChartTrend(candles, timeframe)
      : trendFromIndicators(indicators);
  const higherTfTrend = trendFromHtfBias(htfBias);
  const overallTrend = combineOverallTrend(chartTrend, higherTfTrend, indicators.adx);

  const trendSummary = `Chart (${timeframe}): ${chartTrend} · Higher TF (${higherTf}): ${higherTfTrend} · Overall: ${overallTrend}`;
  const trendDetail = buildTrendDetail(
    chartTrend,
    higherTfTrend,
    overallTrend,
    timeframe,
    higherTf
  );

  return { chartTrend, higherTfTrend, overallTrend, trendSummary, trendDetail };
}

export function buildOneLiner(action: string, regime: CryptoMarketRegime, htfAligned: boolean): string {
  const trendNote = htfAligned ? "with higher timeframe trend" : "against higher timeframe trend (be careful)";
  const regimeMap: Record<CryptoMarketRegime, string> = {
    strong_uptrend: "in a strong uptrend",
    strong_downtrend: "in a strong downtrend",
    pullback_in_uptrend: "on a pullback inside an uptrend",
    pullback_in_downtrend: "on a bounce inside a downtrend",
    breakout: "on a confirmed breakout",
    breakdown: "on a confirmed breakdown",
    ranging: "in a sideways market",
    high_volatility: "in high-volatility conditions",
  };
  return `${action} ${regimeMap[regime]}, ${trendNote}.`;
}
