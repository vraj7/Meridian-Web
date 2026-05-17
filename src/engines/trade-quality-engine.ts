/**
 * Pro-grade trade analysis layered on top of the raw signal engine.
 *
 * Goals (matches user spec):
 *  - Confidence is *built from components*, not a raw bull/bear ratio.
 *  - Multi-timeframe alignment, momentum, volume, volatility, structure,
 *    sentiment, and liquidity each contribute weighted points.
 *  - Quality grade A+/A/B/C/D reflects realistic professional setups.
 *  - Warnings are structured and AUTOMATICALLY reduce confidence.
 *  - Entry-timing intelligence detects overextension and exhaustion.
 *  - Execution mode tells the user *what to do* (aggressive vs wait vs avoid).
 */

import type {
  Candle,
  ConfidenceBand,
  CryptoMarketRegime,
  ExecutionMode,
  FuturesMetrics,
  IndicatorSnapshot,
  MarketTrendLabel,
  SentimentData,
  TradeQuality,
  TradeWarning,
  TrendAlignment,
} from "@/types";

// ---------------------------------------------------------------------------
// Component scoring (each returns 0-100)
// ---------------------------------------------------------------------------

export interface ScoreContext {
  isBullish: boolean;
  price: number;
  indicators: IndicatorSnapshot;
  chartTrend: MarketTrendLabel;
  higherTfTrend: MarketTrendLabel;
  highestTfTrend?: MarketTrendLabel;
  /** Pre-resolved regime from detectCryptoRegime. */
  regime: CryptoMarketRegime;
  nearestSupport: number;
  nearestResistance: number;
  sentiment?: SentimentData;
  futures?: FuturesMetrics;
  candles: Candle[];
  /** Risk/reward of the proposed trade. */
  riskReward: number;
  /** True for futures market with depth/OI data. */
  isFutures: boolean;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(100, x));
}

/** Higher score when more TFs agree with the trade direction. */
function scoreTrendAlignment(ctx: ScoreContext): {
  score: number;
  alignment: TrendAlignment;
} {
  const dir: MarketTrendLabel = ctx.isBullish ? "Uptrend" : "Downtrend";
  const trends: MarketTrendLabel[] = [ctx.chartTrend, ctx.higherTfTrend];
  if (ctx.highestTfTrend) trends.push(ctx.highestTfTrend);

  let agreementCount = 0;
  let opposingCount = 0;
  let sidewaysCount = 0;

  for (const t of trends) {
    if (t === dir) agreementCount++;
    else if (t === "Sideways") sidewaysCount++;
    else opposingCount++;
  }

  // Weight: chart 30, higher 35, highest 35 (broader = more weight)
  const weights = [30, 35, 35];
  let score = 0;
  let weightUsed = 0;
  for (let i = 0; i < trends.length; i++) {
    const w = weights[i];
    weightUsed += w;
    if (trends[i] === dir) score += w;
    else if (trends[i] === "Sideways") score += w * 0.4;
    // opposing → 0
  }
  if (weightUsed > 0) score = (score / weightUsed) * 100;

  const alignment: TrendAlignment = {
    chart: ctx.chartTrend,
    higher: ctx.higherTfTrend,
    highest: ctx.highestTfTrend,
    agreementCount,
    alignmentScore: Math.round(score),
  };

  void opposingCount;
  void sidewaysCount;
  return { score: clamp01(score), alignment };
}

function scoreMomentum(ctx: ScoreContext): number {
  const { indicators: ind, isBullish } = ctx;
  let s = 50;

  // MACD histogram in trade direction
  if (isBullish && ind.macd.histogram > 0) s += 10;
  if (!isBullish && ind.macd.histogram < 0) s += 10;
  if (isBullish && ind.macd.macd > ind.macd.signal) s += 5;
  if (!isBullish && ind.macd.macd < ind.macd.signal) s += 5;

  // RSI directional bias (not extremes — those are scored separately)
  if (isBullish && ind.rsi >= 50 && ind.rsi <= 70) s += 10;
  if (!isBullish && ind.rsi <= 50 && ind.rsi >= 30) s += 10;

  // ADX strength
  if (ind.adx >= 25) s += 10;
  else if (ind.adx < 18) s -= 10;

  // EMA stack
  if (isBullish && ind.ema9 > ind.ema21 && ind.ema21 > ind.ema50) s += 10;
  if (!isBullish && ind.ema9 < ind.ema21 && ind.ema21 < ind.ema50) s += 10;

  // Trend-strength bonus
  s += ind.trendStrength * 0.1;

  return clamp01(s);
}

function scoreVolume(ctx: ScoreContext): number {
  const v = ctx.indicators.volumeSpike;
  if (v >= 1.8) return 90;
  if (v >= 1.4) return 75;
  if (v >= 1.1) return 60;
  if (v >= 0.8) return 50;
  if (v >= 0.6) return 35;
  return 20;
}

function scoreVolatility(ctx: ScoreContext): number {
  const atrPct = (ctx.indicators.atr / ctx.price) * 100;
  // Optimal for crypto intraday: 1-3%. Below 0.5% = dead, above 5% = chaotic.
  if (atrPct < 0.3) return 30;
  if (atrPct < 0.8) return 55;
  if (atrPct < 2) return 80;
  if (atrPct < 3.5) return 70;
  if (atrPct < 5) return 50;
  return 30;
}

/** Reward (TP) for being away from immediate S/R into your direction. */
function scoreStructure(ctx: ScoreContext): number {
  const { isBullish, price, nearestSupport, nearestResistance } = ctx;
  if (price <= 0) return 50;

  const distSup = (price - nearestSupport) / price;
  const distRes = (nearestResistance - price) / price;

  // For LONG: want headroom above (distRes large) AND not chasing into resistance.
  // For SHORT: want headroom below (distSup large) AND not stabbing into support.
  let s = 50;
  if (isBullish) {
    if (distRes > 0.03) s += 25;
    else if (distRes > 0.015) s += 10;
    else if (distRes < 0.005) s -= 25; // crashing into resistance
    if (distSup < 0.005) s -= 10; // entering at support — fine for buyers but risky
    else if (distSup > 0.01 && distSup < 0.03) s += 10;
  } else {
    if (distSup > 0.03) s += 25;
    else if (distSup > 0.015) s += 10;
    else if (distSup < 0.005) s -= 25;
    if (distRes < 0.005) s -= 10;
    else if (distRes > 0.01 && distRes < 0.03) s += 10;
  }

  return clamp01(s);
}

function scoreSentimentSignal(ctx: ScoreContext): number {
  const s = ctx.sentiment;
  if (!s) return 50;
  const direction = ctx.isBullish ? 1 : -1;
  // overall ranges roughly -1..+1 (text + social composite)
  const aligned = s.overall * direction; // -1..+1
  let score = 50 + aligned * 30; // ±30 swing

  // Fear & greed: extreme readings are contrarian for trend trades
  if (ctx.isBullish && s.fearGreed <= 25) score += 10; // buying fear = good
  if (!ctx.isBullish && s.fearGreed >= 75) score += 10; // shorting greed = good

  return clamp01(score);
}

function scoreLiquidity(ctx: ScoreContext): number {
  // Crypto liquidity proxies: volume not collapsed + futures OI present + no squeeze
  let s = 60;
  if (ctx.indicators.volumeSpike < 0.4) s -= 25; // crashed volume
  if (ctx.indicators.volumeSpike >= 1) s += 10;
  if (ctx.futures) {
    if (ctx.futures.openInterest > 1e8) s += 10;
    if (Math.abs(ctx.futures.fundingRate) > 0.015) s -= 10; // funding chaos
    if (
      (ctx.isBullish && ctx.futures.squeezeRisk === "long") ||
      (!ctx.isBullish && ctx.futures.squeezeRisk === "short")
    ) {
      s -= 15;
    }
  }
  return clamp01(s);
}

// ---------------------------------------------------------------------------
// Weighted confidence + win probability
// ---------------------------------------------------------------------------

export const COMPONENT_WEIGHTS = {
  trendAlignment: 0.25,
  momentum: 0.2,
  volume: 0.15,
  volatility: 0.1,
  structure: 0.15,
  sentiment: 0.1,
  liquidity: 0.05,
} as const;

export interface ConfidenceBreakdown {
  trendAlignment: number;
  momentum: number;
  volume: number;
  volatility: number;
  structure: number;
  sentiment: number;
  liquidity: number;
}

export interface ConfidenceResult {
  confidence: number;
  winProbability: number;
  breakdown: ConfidenceBreakdown;
  alignment: TrendAlignment;
}

export function computeConfidence(ctx: ScoreContext): ConfidenceResult {
  const { score: trendScore, alignment } = scoreTrendAlignment(ctx);
  const breakdown: ConfidenceBreakdown = {
    trendAlignment: trendScore,
    momentum: scoreMomentum(ctx),
    volume: scoreVolume(ctx),
    volatility: scoreVolatility(ctx),
    structure: scoreStructure(ctx),
    sentiment: scoreSentimentSignal(ctx),
    liquidity: scoreLiquidity(ctx),
  };

  const weighted =
    breakdown.trendAlignment * COMPONENT_WEIGHTS.trendAlignment +
    breakdown.momentum * COMPONENT_WEIGHTS.momentum +
    breakdown.volume * COMPONENT_WEIGHTS.volume +
    breakdown.volatility * COMPONENT_WEIGHTS.volatility +
    breakdown.structure * COMPONENT_WEIGHTS.structure +
    breakdown.sentiment * COMPONENT_WEIGHTS.sentiment +
    breakdown.liquidity * COMPONENT_WEIGHTS.liquidity;

  // Win-prob uses same breakdown but is calibrated to realistic crypto ranges.
  // Even an excellent setup should rarely show >75%.
  const winRaw = weighted;
  // Bonus for exceptional alignment (all 3 TFs agree)
  const alignmentBonus = alignment.agreementCount >= 3 ? 3 : 0;
  const winProbability = Math.round(
    Math.max(35, Math.min(78, winRaw * 0.82 + 8 + alignmentBonus))
  );

  // R:R multiplier on confidence (good R:R earns conviction)
  const rrMult =
    ctx.riskReward >= 2.5 ? 1.05 : ctx.riskReward >= 1.8 ? 1.0 : ctx.riskReward >= 1.4 ? 0.92 : 0.8;
  const confidence = Math.round(Math.max(20, Math.min(95, weighted * rrMult)));

  return { confidence, winProbability, breakdown, alignment };
}

export function confidenceBand(confidence: number): ConfidenceBand {
  if (confidence >= 85) return "Very High";
  if (confidence >= 70) return "High";
  if (confidence >= 55) return "Medium";
  return "Weak";
}

// ---------------------------------------------------------------------------
// Smart warnings + automatic confidence penalty
// ---------------------------------------------------------------------------

export function buildSmartWarnings(ctx: ScoreContext): TradeWarning[] {
  const { indicators: ind, isBullish, price, regime } = ctx;
  const out: TradeWarning[] = [];
  const atrPct = (ind.atr / price) * 100;

  // Distance from VWAP and EMA21 — overextension proxies
  const vwapDistPct = ((price - ind.vwap) / ind.vwap) * 100;
  const emaDistPct = ((price - ind.ema21) / ind.ema21) * 100;

  if (isBullish && vwapDistPct > 2.5) {
    out.push({
      message: `Price extended ${vwapDistPct.toFixed(1)}% above VWAP — chasing risk`,
      severity: "caution",
      penalty: 6,
    });
  }
  if (!isBullish && vwapDistPct < -2.5) {
    out.push({
      message: `Price extended ${Math.abs(vwapDistPct).toFixed(1)}% below VWAP — short squeeze risk`,
      severity: "caution",
      penalty: 6,
    });
  }
  if (isBullish && emaDistPct > 3) {
    out.push({
      message: `Price ${emaDistPct.toFixed(1)}% above EMA21 — wait for pullback to EMA21`,
      severity: "caution",
      penalty: 5,
    });
  }
  if (!isBullish && emaDistPct < -3) {
    out.push({
      message: `Price ${Math.abs(emaDistPct).toFixed(1)}% below EMA21 — wait for rally to EMA21`,
      severity: "caution",
      penalty: 5,
    });
  }

  // Bollinger extremes
  if (isBullish && price > ind.bb.upper * 1.005) {
    out.push({
      message: "Price above upper Bollinger — exhaustion likely, expect mean reversion",
      severity: "caution",
      penalty: 5,
    });
  }
  if (!isBullish && price < ind.bb.lower * 0.995) {
    out.push({
      message: "Price below lower Bollinger — exhaustion likely, expect bounce",
      severity: "caution",
      penalty: 5,
    });
  }

  // RSI extremes — counter-direction risk
  if (!isBullish && ind.rsi < 20) {
    out.push({
      message: "RSI < 20 — short squeeze risk, avoid fresh shorts",
      severity: "high",
      penalty: 12,
    });
  }
  if (isBullish && ind.rsi > 80) {
    out.push({
      message: "RSI > 80 — overbought, pullback risk before further upside",
      severity: "high",
      penalty: 10,
    });
  }

  // Support/resistance proximity
  const distRes = ((ctx.nearestResistance - price) / price) * 100;
  const distSup = ((price - ctx.nearestSupport) / price) * 100;
  if (isBullish && distRes < 0.4) {
    out.push({
      message: `Near resistance (${distRes.toFixed(2)}%) — breakout confirmation needed before entry`,
      severity: "high",
      penalty: 10,
    });
  }
  if (!isBullish && distSup < 0.4) {
    out.push({
      message: `Near support (${distSup.toFixed(2)}%) — breakdown confirmation needed before entry`,
      severity: "high",
      penalty: 10,
    });
  }

  // Volatility extremes
  if (atrPct > 5) {
    out.push({
      message: `Extreme volatility (ATR ${atrPct.toFixed(1)}%) — reduce size sharply`,
      severity: "high",
      penalty: 8,
    });
  } else if (atrPct < 0.4) {
    out.push({
      message: `Very low volatility (ATR ${atrPct.toFixed(1)}%) — wait for a breakout`,
      severity: "caution",
      penalty: 4,
    });
  }

  // Trend strength
  if (ind.adx < 18) {
    out.push({
      message: `Weak trend (ADX ${ind.adx.toFixed(0)}) — choppy market, avoid breakout trades`,
      severity: "caution",
      penalty: 6,
    });
  }

  // Counter-trend warnings
  if (
    (isBullish && ctx.higherTfTrend === "Downtrend") ||
    (!isBullish && ctx.higherTfTrend === "Uptrend")
  ) {
    out.push({
      message: "Counter-trend trade against higher timeframe — reduce size",
      severity: "high",
      penalty: 10,
    });
  }

  // Liquidity
  if (ind.volumeSpike < 0.5) {
    out.push({
      message: "Low liquidity — slippage and volatility risk higher",
      severity: "caution",
      penalty: 5,
    });
  }

  // Futures-specific
  if (ctx.futures?.volatilityAlert) {
    out.push({
      message: "Funding-rate volatility spike — reduce leverage",
      severity: "caution",
      penalty: 4,
    });
  }
  if (
    isBullish &&
    ctx.futures &&
    ctx.futures.longShortRatio > 2 &&
    regime !== "strong_uptrend"
  ) {
    out.push({
      message: `Crowded longs (L/S ${ctx.futures.longShortRatio.toFixed(2)}) — long flush risk`,
      severity: "caution",
      penalty: 5,
    });
  }
  if (
    !isBullish &&
    ctx.futures &&
    ctx.futures.longShortRatio < 0.5 &&
    regime !== "strong_downtrend"
  ) {
    out.push({
      message: `Crowded shorts (L/S ${ctx.futures.longShortRatio.toFixed(2)}) — short squeeze risk`,
      severity: "caution",
      penalty: 5,
    });
  }

  return out;
}

export function applyWarningPenalty(
  confidence: number,
  warnings: TradeWarning[],
  relaxed = false
): number {
  const penaltyCap = relaxed ? 12 : 22;
  const floor = relaxed ? 32 : 22;
  const total = Math.min(
    penaltyCap,
    warnings.reduce((s, w) => s + (w.penalty ?? 0), 0)
  );
  return Math.max(floor, confidence - total);
}

// ---------------------------------------------------------------------------
// Trade quality grade A+/A/B/C/D
// ---------------------------------------------------------------------------

export interface QualityInputs {
  confidence: number;
  winProbability: number;
  riskReward: number;
  alignment: TrendAlignment;
  warnings: TradeWarning[];
  isBullish: boolean;
  indicators: IndicatorSnapshot;
  highestTfTrend?: MarketTrendLabel;
  timeframe: "scalp" | "intraday" | "swing";
}

export function classifyTradeQuality(p: QualityInputs): TradeQuality {
  const {
    confidence,
    winProbability,
    riskReward,
    alignment,
    warnings,
    isBullish,
    indicators: ind,
    highestTfTrend,
    timeframe,
  } = p;

  const highSeverity = warnings.filter((w) => w.severity === "high").length;

  // ---- HARD downgrade rules (cannot be A+/A) ----
  const blockedFromTop =
    riskReward < 1.8 ||
    winProbability < 60 ||
    highSeverity >= 2 ||
    (highestTfTrend && highestTfTrend === "Sideways" && alignment.agreementCount < 2) ||
    // Never "STRONG SHORT" if 1D is bullish/sideways
    (!isBullish &&
      (highestTfTrend === "Uptrend" || highestTfTrend === "Sideways")) ||
    // Never STRONG with extreme RSI in counter direction
    (!isBullish && ind.rsi < 25) ||
    (isBullish && ind.rsi > 75);

  // ---- Avoid ("D") rules ----
  const minRR = timeframe === "scalp" ? 1.5 : 1.8;
  const dRules =
    confidence < 38 ||
    winProbability < 48 ||
    riskReward < minRR - 0.2 ||
    highSeverity >= 4;
  if (dRules) return "D";

  // ---- C: weak/risky ----
  if (confidence < 55 || winProbability < 54 || riskReward < minRR + 0.05) {
    return "C";
  }

  // ---- A+ requirements ----
  const aPlus =
    !blockedFromTop &&
    confidence >= 78 &&
    winProbability >= 68 &&
    riskReward >= 2.2 &&
    alignment.agreementCount >= 3 &&
    highSeverity === 0;
  if (aPlus) return "A+";

  // ---- A requirements ----
  const a =
    !blockedFromTop &&
    confidence >= 70 &&
    winProbability >= 62 &&
    riskReward >= 1.8 &&
    alignment.agreementCount >= 2;
  if (a) return "A";

  return "B";
}

// ---------------------------------------------------------------------------
// Entry-timing intelligence & execution mode
// ---------------------------------------------------------------------------

export interface ExecutionRecommendation {
  mode: ExecutionMode;
  plan: string;
  capitalPreservation: boolean;
}

export interface ExecutionContext {
  isBullish: boolean;
  inZone: boolean;
  distanceToEntryPct: number;
  indicators: IndicatorSnapshot;
  price: number;
  regime: CryptoMarketRegime;
  quality: TradeQuality;
  confidence: number;
  warnings: TradeWarning[];
  entryZone: [number, number];
  stopLoss: number;
}

export function recommendExecution(ctx: ExecutionContext): ExecutionRecommendation {
  const {
    isBullish,
    inZone,
    distanceToEntryPct,
    indicators: ind,
    price,
    regime,
    quality,
    confidence,
    warnings,
    entryZone,
  } = ctx;

  const highSeverityWarnings = warnings.filter((w) => w.severity === "high").length;

  // Capital preservation triggers — overrides everything else
  if (
    quality === "D" ||
    confidence < 42 ||
    highSeverityWarnings >= 3 ||
    (regime === "ranging" && ind.adx < 12)
  ) {
    return {
      mode: "capital_preservation",
      plan:
        "Conditions too mixed — sit out and wait for a higher-quality setup. Capital preservation is the trade.",
      capitalPreservation: true,
    };
  }

  // Overextension — wait for retest
  const vwapDistPct = ((price - ind.vwap) / ind.vwap) * 100;
  const emaDistPct = ((price - ind.ema21) / ind.ema21) * 100;
  if (
    (isBullish && (vwapDistPct > 2.5 || emaDistPct > 3 || price > ind.bb.upper * 1.005)) ||
    (!isBullish && (vwapDistPct < -2.5 || emaDistPct < -3 || price < ind.bb.lower * 0.995))
  ) {
    const tgt = isBullish ? ind.ema21 : ind.ema21;
    return {
      mode: "wait_retest",
      plan: isBullish
        ? `Price extended — wait for a pullback toward EMA21 (${tgt.toFixed(4)}) before entering.`
        : `Price extended — wait for a rally toward EMA21 (${tgt.toFixed(4)}) before shorting.`,
      capitalPreservation: false,
    };
  }

  // Strong trend but you're late — distance from entry too large
  if (Math.abs(distanceToEntryPct) > 1.5) {
    return {
      mode: "avoid_chase",
      plan: isBullish
        ? `Price ran ${distanceToEntryPct.toFixed(1)}% past ideal entry — do not chase. Set an alert at ${entryZone[0].toFixed(4)}.`
        : `Price moved ${Math.abs(distanceToEntryPct).toFixed(1)}% past ideal entry — do not chase. Set an alert at ${entryZone[1].toFixed(4)}.`,
      capitalPreservation: false,
    };
  }

  // Setup forming but not enough confirmation
  if (quality === "C" || confidence < 62) {
    return {
      mode: "wait_confirmation",
      plan: isBullish
        ? "Setup forming — wait for a strong bullish confirmation candle close above the entry zone."
        : "Setup forming — wait for a strong bearish confirmation candle close below the entry zone.",
      capitalPreservation: false,
    };
  }

  // A+ in zone — aggressive entry OK
  if (quality === "A+" && inZone) {
    return {
      mode: "aggressive",
      plan: isBullish
        ? "All systems aligned — market entry acceptable. Place stop and TP immediately."
        : "All systems aligned — market short acceptable. Place stop and TP immediately.",
      capitalPreservation: false,
    };
  }

  // A in zone — conservative scale-in
  if ((quality === "A" || quality === "A+") && inZone) {
    return {
      mode: "scale_in",
      plan: isBullish
        ? `Scale in: 50% at market, 50% as a limit near ${entryZone[0].toFixed(4)}.`
        : `Scale in: 50% at market, 50% as a limit near ${entryZone[1].toFixed(4)}.`,
      capitalPreservation: false,
    };
  }

  // Default — conservative limit entry inside zone
  const limit = isBullish
    ? entryZone[0] + (entryZone[1] - entryZone[0]) * 0.35
    : entryZone[0] + (entryZone[1] - entryZone[0]) * 0.65;
  return {
    mode: "conservative",
    plan: isBullish
      ? `Place a limit buy at ${limit.toFixed(4)} (lower part of zone) and let price come to you.`
      : `Place a limit sell at ${limit.toFixed(4)} (upper part of zone) and let price come to you.`,
    capitalPreservation: false,
  };
}

// ---------------------------------------------------------------------------
// Contextual AI commentary
// ---------------------------------------------------------------------------

export interface CommentaryContext {
  isBullish: boolean;
  alignment: TrendAlignment;
  quality: TradeQuality;
  confidence: number;
  winProbability: number;
  riskReward: number;
  regime: CryptoMarketRegime;
  executionMode: ExecutionMode;
  warnings: TradeWarning[];
  indicators: IndicatorSnapshot;
  price: number;
  symbol: string;
}

export function buildContextualCommentary(c: CommentaryContext): string {
  const direction = c.isBullish ? "long" : "short";
  const parts: string[] = [];

  // Lead with the verdict
  if (c.executionMode === "capital_preservation") {
    parts.push(
      `${c.symbol}: capital preservation mode. The picture is too mixed to risk capital — wait for a cleaner setup.`
    );
  } else if (c.quality === "A+") {
    parts.push(
      `${c.symbol}: A+ ${direction} — multi-timeframe trend, momentum and structure all agree. Execute with discipline.`
    );
  } else if (c.quality === "A") {
    parts.push(`${c.symbol}: A-grade ${direction} setup with good multi-TF alignment.`);
  } else if (c.quality === "B") {
    parts.push(`${c.symbol}: B-grade ${direction} — decent intraday setup, take size carefully.`);
  } else if (c.quality === "C") {
    parts.push(`${c.symbol}: C-grade ${direction} — risky, wait for confirmation or skip.`);
  } else {
    parts.push(`${c.symbol}: D-grade — do not trade. Setup fails minimum quality checks.`);
  }

  // Trend story
  if (c.alignment.agreementCount >= 3) {
    parts.push("All timeframes are aligned with the trade direction.");
  } else if (c.alignment.agreementCount === 2) {
    parts.push("Two of three timeframes agree — moderate trend support.");
  } else if (c.alignment.agreementCount === 1) {
    parts.push("Only one timeframe agrees — counter-trend risk is elevated.");
  } else {
    parts.push("No timeframe supports this direction — counter-trend trade.");
  }

  // Why this is or isn't strong
  const reasonBits: string[] = [];
  if (c.riskReward >= 2.5) reasonBits.push(`R:R ${c.riskReward.toFixed(2)}x is excellent`);
  else if (c.riskReward >= 1.8) reasonBits.push(`R:R ${c.riskReward.toFixed(2)}x is acceptable`);
  else reasonBits.push(`R:R ${c.riskReward.toFixed(2)}x is below pro threshold`);

  if (c.indicators.adx >= 25) reasonBits.push(`trend strength solid (ADX ${c.indicators.adx.toFixed(0)})`);
  else reasonBits.push(`trend strength weak (ADX ${c.indicators.adx.toFixed(0)})`);

  parts.push(`Setup quality: ${reasonBits.join(", ")}.`);

  // Timing
  if (c.executionMode === "avoid_chase") {
    parts.push("Entry timing: late — do not chase. Wait for a pullback.");
  } else if (c.executionMode === "wait_retest") {
    parts.push("Entry timing: price is extended past ideal. Wait for a retest into the zone.");
  } else if (c.executionMode === "wait_confirmation") {
    parts.push("Entry timing: setup forming — wait for confirmation candle.");
  } else if (c.executionMode === "scale_in") {
    parts.push("Entry style: scale in across the zone instead of full market entry.");
  } else if (c.executionMode === "aggressive") {
    parts.push("Entry timing: all clear — execute now with predefined stop and TP.");
  } else if (c.executionMode === "conservative") {
    parts.push("Entry style: passive limit order — let price come to you.");
  }

  // Squeeze probability
  if (!c.isBullish && c.indicators.rsi < 25) {
    parts.push("Short-squeeze probability is elevated — consider waiting for a relief bounce first.");
  }
  if (c.isBullish && c.indicators.rsi > 75) {
    parts.push("Long-trap probability is elevated — expect a pullback before continuation.");
  }

  // Counter-trend vs trend-following
  if (
    (c.isBullish && c.alignment.higher === "Downtrend") ||
    (!c.isBullish && c.alignment.higher === "Uptrend")
  ) {
    parts.push("This is a counter-trend trade — keep targets small and stops tight.");
  } else if (c.alignment.agreementCount >= 2) {
    parts.push("This is a trend-following trade — partials at first TP, trail the rest.");
  }

  // Win-probability sanity
  parts.push(
    `Modeled win probability: ${c.winProbability}% (realistic for crypto — anything above 75% would be exceptional).`
  );

  return parts.join(" ");
}
