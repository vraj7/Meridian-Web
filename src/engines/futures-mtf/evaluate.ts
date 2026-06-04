import {
  FUTURES_INTRADAY_ALLOWED_GRADES,
  FUTURES_INTRADAY_MIN_CONFIDENCE,
} from "@/config/futures-intraday";
import { formatPairLabel } from "@/config/market";
import { generateId } from "@/lib/utils";
import type { MarketTrendLabel } from "@/types";
import type {
  FuturesConfidenceTier,
  FuturesIntradayAssessment,
  FuturesIntradaySignal,
  FuturesMtfScanInput,
  FuturesMtfTimeframe,
} from "@/types/futures-intraday";
import {
  analyzeFunding,
  analyzeOi,
  btcContextNote,
  volumeConfirmation,
} from "./context-analysis";
import { detectDivergences } from "./divergence";
import { computeExtendedIndicators } from "./extended-indicators";
import { gradeBreakout } from "./breakout-grade";
import { buildLevelMap } from "./levels-engine";
import { analyzeLiquiditySMC } from "./liquidity-smc";
import { analyzeMarketStructure } from "./market-structure";
import { analyzeCandleQuality, detectIntradayPatterns } from "./patterns";
import { buildStopAndTargets } from "./risk-stops";
import { computeIntradayConfidence, resolveDisplayGrade } from "./confidence";
import {
  buildIntradayEntryZone,
  resolveIntradayEntryTiming,
} from "./entry-timing";

const ALLOWED_GRADE_SET = new Set<string>(FUTURES_INTRADAY_ALLOWED_GRADES);

const TF_WEIGHTS: Record<FuturesMtfTimeframe, number> = {
  "15m": 0.4,
  "5m": 0.2,
  "1h": 0.2,
  "4h": 0.15,
  "1d": 0.05,
};

function trendScore(trend: MarketTrendLabel, direction: "LONG" | "SHORT"): number {
  if (direction === "LONG") {
    if (trend === "Uptrend") return 100;
    if (trend === "Sideways") return 55;
    return 15;
  }
  if (trend === "Downtrend") return 100;
  if (trend === "Sideways") return 55;
  return 15;
}

function tierFromConfidence(c: number): FuturesConfidenceTier {
  if (c >= 95) return "Elite";
  if (c >= 90) return "Sniper";
  if (c >= 80) return "High Confidence";
  return "Moderate";
}

function passesEntryRules(params: {
  direction: "LONG" | "SHORT";
  trends: Record<FuturesMtfTimeframe, MarketTrendLabel>;
  ind15: NonNullable<ReturnType<typeof computeExtendedIndicators>>;
  ind5: NonNullable<ReturnType<typeof computeExtendedIndicators>>;
  levels: ReturnType<typeof buildLevelMap>;
  volumeOk: boolean;
  structure: ReturnType<typeof analyzeMarketStructure>;
}): { ok: boolean; reasons: string[] } {
  const { direction, trends, ind15, ind5, levels, volumeOk, structure } = params;
  const reasons: string[] = [];
  const dailyOk =
    direction === "LONG"
      ? trends["1d"] !== "Downtrend"
      : trends["1d"] !== "Uptrend";
  const h4Ok =
    direction === "LONG"
      ? trends["4h"] === "Uptrend"
      : trends["4h"] === "Downtrend";
  const h1Ok =
    direction === "LONG" ? trends["1h"] === "Uptrend" : trends["1h"] === "Downtrend";
  const m15Ok =
    direction === "LONG" ? trends["15m"] === "Uptrend" : trends["15m"] === "Downtrend";
  const m5Ok =
    direction === "LONG"
      ? ind5.momentum > 0 && ind5.relativeVolume >= 1
      : ind5.momentum < 0 && ind5.relativeVolume >= 1;

  if (!dailyOk) reasons.push("Daily trend opposes direction");
  if (!h4Ok) reasons.push("4H filter failed");
  if (!h1Ok) reasons.push("1H trend not aligned");
  if (!m15Ok) reasons.push("15M setup not aligned");
  if (!m5Ok) reasons.push("5M momentum/volume confirmation missing");
  if (ind15.adx < 20) reasons.push("ADX < 20 on 15m");
  if (!volumeOk) reasons.push("Volume confirmation failed");
  if (
    direction === "LONG"
      ? levels.nearestResistanceBlocksLong
      : levels.nearestSupportBlocksShort
  ) {
    reasons.push("Major level blocks entry");
  }
  const structOk =
    direction === "LONG"
      ? structure.bias !== "bearish"
      : structure.bias !== "bullish";
  if (!structOk) reasons.push("Market structure opposes trade");

  const ok =
    dailyOk &&
    h4Ok &&
    h1Ok &&
    m15Ok &&
    m5Ok &&
    ind15.adx >= 20 &&
    volumeOk &&
    structOk &&
    !(direction === "LONG"
      ? levels.nearestResistanceBlocksLong
      : levels.nearestSupportBlocksShort);

  return { ok, reasons };
}

export function evaluateFuturesIntradaySetup(
  input: FuturesMtfScanInput
): FuturesIntradaySignal | null {
  const { symbol, coinId, candles, futures, context } = input;
  const c15 = candles["15m"];
  const c5 = candles["5m"];
  if (c15.length < 60 || c5.length < 40) return null;

  const ind15 = computeExtendedIndicators(c15);
  const ind5 = computeExtendedIndicators(c5);
  const ind1h = computeExtendedIndicators(candles["1h"]);
  const ind4h = computeExtendedIndicators(candles["4h"]);
  const ind1d = computeExtendedIndicators(candles["1d"]);
  if (!ind15 || !ind5) return null;

  const price = input.currentPrice ?? c15[c15.length - 1].close;
  const levels = buildLevelMap(c15);
  const structure = analyzeMarketStructure(c15);
  const liquidity = analyzeLiquiditySMC(c15);
  const divergences = detectDivergences(c15);
  const { patterns, strength: patternStrength } = detectIntradayPatterns(c15);
  const candleQ = analyzeCandleQuality(c15);

  const trendByTf: Record<FuturesMtfTimeframe, MarketTrendLabel> = {
    "5m": ind5.trend,
    "15m": ind15.trend,
    "1h": ind1h?.trend ?? "Sideways",
    "4h": ind4h?.trend ?? "Sideways",
    "1d": ind1d?.trend ?? "Sideways",
  };

  const longMtf =
    Object.entries(TF_WEIGHTS).reduce(
      (s, [tf, w]) => s + trendScore(trendByTf[tf as FuturesMtfTimeframe], "LONG") * w,
      0
    ) / 100;
  const shortMtf =
    Object.entries(TF_WEIGHTS).reduce(
      (s, [tf, w]) => s + trendScore(trendByTf[tf as FuturesMtfTimeframe], "SHORT") * w,
      0
    ) / 100;

  const direction: "LONG" | "SHORT" = longMtf >= shortMtf + 0.08 ? "LONG" : "SHORT";
  if (Math.abs(longMtf - shortMtf) < 0.12) return null;

  const vol = volumeConfirmation(ind15, ind5, direction);
  const entryCheck = passesEntryRules({
    direction,
    trends: trendByTf,
    ind15,
    ind5,
    levels,
    volumeOk: vol.ok,
    structure,
  });
  if (!entryCheck.ok) return null;

  const plan = buildStopAndTargets({ direction, price, ind15, levels, liquidity });
  if (!plan || plan.riskPercent > 2 || plan.holdingMinutes > 60) return null;

  const funding = analyzeFunding(futures);
  if (funding.crowded === "long" && direction === "LONG") return null;
  if (funding.crowded === "short" && direction === "SHORT") return null;

  const chg =
    c15.length > 5
      ? ((c15[c15.length - 1].close - c15[c15.length - 6].close) / c15[c15.length - 6].close) *
        100
      : 0;
  const oi = analyzeOi(futures, direction, chg);
  const btcNote = btcContextNote(symbol, direction, context.btcTrend, context.btcCorrelation);

  const breakoutGrade = gradeBreakout({
    direction,
    ind15,
    ind5,
    levels,
    volumeOk: vol.ok,
    structureScore: structure.score,
  });
  if (!ALLOWED_GRADE_SET.has(breakoutGrade)) return null;

  const confidence = computeIntradayConfidence({
    direction,
    longMtf,
    shortMtf,
    structureScore: structure.score,
    volOk: vol.ok,
    volScore: vol.score,
    divergenceScore: divergences.score,
    patternStrength,
    candleScore: candleQ.score,
    oiBonus: oi.bonus,
    fundingPenalty: funding.penalty,
    btcPenalty: btcNote.penalty,
    adx: ind15.adx,
    breakoutGrade,
    stopQuality: plan.stopLossQuality,
    hasValidPlan: true,
    entryRulesOk: true,
    entryFailCount: 0,
  });

  if (confidence < FUTURES_INTRADAY_MIN_CONFIDENCE) return null;

  const entryZone = buildIntradayEntryZone({ direction, price, ind15, levels });
  const entryTiming = resolveIntradayEntryTiming({
    direction,
    currentPrice: price,
    entryZone,
    candles5m: c5,
    atr: ind15.atr,
  });

  if (!entryTiming.readyToEnter) return null;

  const winProbability = Math.min(
    92,
    Math.round(
      confidence * 0.55 +
        plan.riskReward * 8 +
        (ind15.adx >= 25 ? 8 : 0) +
        (vol.ok ? 6 : 0) -
        liquidity.stopHuntRisk * 0.08
    )
  );
  const riskScore = Math.round(
    plan.riskPercent * 25 + liquidity.stopHuntRisk * 0.35 + (100 - plan.stopLossQuality) * 0.2
  );

  const confirmations: string[] = [
    `MTF alignment ${Math.round((direction === "LONG" ? longMtf : shortMtf) * 100)}%`,
    ...structure.events.slice(0, 2),
    vol.note,
    oi.note,
    `Breakout grade ${breakoutGrade}`,
  ];
  if (patterns.length) confirmations.push(patterns[0]);

  const warnings: string[] = [];
  if (funding.penalty) warnings.push(funding.note);
  if (btcNote.penalty) warnings.push(btcNote.note);
  if (liquidity.stopHuntRisk > 55) warnings.push("Elevated stop-hunt / liquidity risk");

  const invalidation =
    direction === "LONG"
      ? [
          `Close below ${plan.stopLoss.toFixed(2)}`,
          "15m structure flips to LH/LL",
          "5m momentum turns negative on volume",
        ]
      : [
          `Close above ${plan.stopLoss.toFixed(2)}`,
          "15m structure flips to HH/HL",
          "5m momentum turns positive on volume",
        ];

  const smcNotes: string[] = [];
  if (liquidity.fvgs.length) smcNotes.push(`${liquidity.fvgs.length} FVG zone(s) nearby`);
  if (liquidity.orderBlocks.length) smcNotes.push("Order block confluence");
  if (liquidity.liquiditySweep) smcNotes.push("Recent liquidity sweep detected");

  const aiReasoning = [
    `${symbol} ${direction} intraday futures setup on 15m execution with ${breakoutGrade} breakout quality.`,
    `Confidence ${confidence}% (${tierFromConfidence(confidence)}): ${confirmations.slice(0, 3).join("; ")}.`,
    entryTiming.entryTimingNote,
    funding.note + ". " + btcNote.note + ".",
    `Liquidity: equal highs ${liquidity.equalHighs.length}, equal lows ${liquidity.equalLows.length}. Invalidation if ${invalidation[0]}.`,
  ].join(" ");

  const positionPlan =
    "TP1: close 25% · move SL to breakeven. TP2: close 25%. TP3: close remaining 50%. Target window ≤60m.";

  return {
    id: generateId(),
    symbol,
    coinId,
    pairLabel: formatPairLabel(symbol),
    direction,
    entry: plan.entry,
    stopLoss: plan.stopLoss,
    tp1: plan.tp1,
    tp2: plan.tp2,
    tp3: plan.tp3,
    tp4: plan.tp4,
    riskPercent: plan.riskPercent,
    rewardPercent: plan.rewardPercent,
    riskReward: plan.riskReward,
    confidence,
    confidenceTier: tierFromConfidence(confidence),
    winProbability,
    riskScore,
    setupGrade: resolveDisplayGrade(breakoutGrade, confidence),
    breakoutGrade,
    holdingMinutes: plan.holdingMinutes,
    stopLossQuality: plan.stopLossQuality,
    timestamp: Date.now(),
    currentPrice: price,
    trendByTf,
    structure,
    indicators15m: ind15,
    liquidity,
    divergences,
    patterns,
    candleQuality: candleQ.label,
    volumeNote: vol.note,
    fundingNote: funding.note,
    oiNote: oi.note,
    btcNote: btcNote.note,
    smcNotes,
    confirmations,
    warnings,
    invalidation,
    aiReasoning,
    positionPlan,
    futures,
    entryZone: entryTiming.entryZone,
    idealEntryPrice: entryTiming.idealEntryPrice,
    entryTimingStatus: entryTiming.status,
    entryTimingNote: entryTiming.entryTimingNote,
    readyToEnter: entryTiming.readyToEnter,
    distanceToEntryPct: entryTiming.distanceToEntryPct,
  };
}

/** Score every coin for the universe table; runs full signal eval when filters pass. */
export function assessFuturesIntradayCoin(
  input: FuturesMtfScanInput
): FuturesIntradayAssessment {
  const { symbol, coinId, candles, futures, context } = input;
  const base = {
    symbol,
    coinId,
    pairLabel: formatPairLabel(symbol),
    confidence: 0,
    status: "no_data" as const,
  };

  const c15 = candles["15m"];
  const c5 = candles["5m"];
  if (c15.length < 60 || c5.length < 40) {
    return { ...base, status: "no_data", rejectReason: "Insufficient candle data" };
  }

  const ind15 = computeExtendedIndicators(c15);
  const ind5 = computeExtendedIndicators(c5);
  const ind1h = computeExtendedIndicators(candles["1h"]);
  const ind4h = computeExtendedIndicators(candles["4h"]);
  const ind1d = computeExtendedIndicators(candles["1d"]);
  if (!ind15 || !ind5) {
    return { ...base, status: "no_data", rejectReason: "Indicator calculation failed" };
  }

  const price = input.currentPrice ?? c15[c15.length - 1].close;
  const levels = buildLevelMap(c15);
  const structure = analyzeMarketStructure(c15);
  const liquidity = analyzeLiquiditySMC(c15);
  const divergences = detectDivergences(c15);
  const { strength: patternStrength } = detectIntradayPatterns(c15);
  const candleQ = analyzeCandleQuality(c15);

  const trendByTf: Record<FuturesMtfTimeframe, MarketTrendLabel> = {
    "5m": ind5.trend,
    "15m": ind15.trend,
    "1h": ind1h?.trend ?? "Sideways",
    "4h": ind4h?.trend ?? "Sideways",
    "1d": ind1d?.trend ?? "Sideways",
  };

  const longMtf =
    Object.entries(TF_WEIGHTS).reduce(
      (s, [tf, w]) => s + trendScore(trendByTf[tf as FuturesMtfTimeframe], "LONG") * w,
      0
    ) / 100;
  const shortMtf =
    Object.entries(TF_WEIGHTS).reduce(
      (s, [tf, w]) => s + trendScore(trendByTf[tf as FuturesMtfTimeframe], "SHORT") * w,
      0
    ) / 100;

  if (Math.abs(longMtf - shortMtf) < 0.12) {
    return {
      ...base,
      status: "no_bias",
      trend15m: ind15.trend,
      rejectReason: "No clear MTF directional bias",
    };
  }

  const direction: "LONG" | "SHORT" = longMtf >= shortMtf + 0.08 ? "LONG" : "SHORT";
  const vol = volumeConfirmation(ind15, ind5, direction);
  const funding = analyzeFunding(futures);
  const chg =
    c15.length > 5
      ? ((c15[c15.length - 1].close - c15[c15.length - 6].close) / c15[c15.length - 6].close) *
        100
      : 0;
  const oi = analyzeOi(futures, direction, chg);
  const btcNote = btcContextNote(symbol, direction, context.btcTrend, context.btcCorrelation);
  const breakoutGrade = gradeBreakout({
    direction,
    ind15,
    ind5,
    levels,
    volumeOk: vol.ok,
    structureScore: structure.score,
  });

  const plan = buildStopAndTargets({ direction, price, ind15, levels, liquidity });
  const entryCheck = passesEntryRules({
    direction,
    trends: trendByTf,
    ind15,
    ind5,
    levels,
    volumeOk: vol.ok,
    structure,
  });

  const confidence = computeIntradayConfidence({
    direction,
    longMtf,
    shortMtf,
    structureScore: structure.score,
    volOk: vol.ok,
    volScore: vol.score,
    divergenceScore: divergences.score,
    patternStrength,
    candleScore: candleQ.score,
    oiBonus: oi.bonus,
    fundingPenalty: funding.penalty,
    btcPenalty: btcNote.penalty,
    adx: ind15.adx,
    breakoutGrade,
    stopQuality: plan?.stopLossQuality,
    hasValidPlan: !!plan && plan.riskPercent <= 2,
    entryRulesOk: entryCheck.ok,
    entryFailCount: entryCheck.reasons.length,
  });

  const entryZone = buildIntradayEntryZone({ direction, price, ind15, levels });
  const entryTiming = resolveIntradayEntryTiming({
    direction,
    currentPrice: price,
    entryZone,
    candles5m: c5,
    atr: ind15.atr,
  });

  const coreFiltersOk =
    entryCheck.ok &&
    !!plan &&
    plan.riskPercent <= 2 &&
    ALLOWED_GRADE_SET.has(breakoutGrade) &&
    confidence >= FUTURES_INTRADAY_MIN_CONFIDENCE &&
    !(funding.crowded === "long" && direction === "LONG") &&
    !(funding.crowded === "short" && direction === "SHORT");

  if (coreFiltersOk && !entryTiming.readyToEnter) {
    return {
      symbol,
      coinId,
      pairLabel: formatPairLabel(symbol),
      status: "watch",
      direction,
      confidence,
      setupGrade: resolveDisplayGrade(breakoutGrade, confidence),
      trend15m: ind15.trend,
      rejectReason: entryTiming.entryTimingNote,
    };
  }

  const signal = evaluateFuturesIntradaySetup(input);
  if (signal) {
    return {
      symbol,
      coinId,
      pairLabel: signal.pairLabel,
      status: "signal",
      direction: signal.direction,
      confidence: signal.confidence,
      setupGrade: signal.setupGrade,
      trend15m: ind15.trend,
    };
  }

  const displayGrade = resolveDisplayGrade(breakoutGrade, confidence);

  let rejectReason = entryCheck.reasons[0] ?? "Did not pass intraday filters";
  if (!ALLOWED_GRADE_SET.has(breakoutGrade)) {
    rejectReason = `Breakout grade ${breakoutGrade} (need ${FUTURES_INTRADAY_ALLOWED_GRADES.join("/")})`;
  } else if (!plan) {
    rejectReason = "Invalid stop/target plan or R:R < 2";
  } else if (plan.riskPercent > 2) {
    rejectReason = "Risk > 2%";
  } else if (confidence < FUTURES_INTRADAY_MIN_CONFIDENCE) {
    rejectReason = `Confidence ${confidence}% below ${FUTURES_INTRADAY_MIN_CONFIDENCE}%`;
  } else if (funding.crowded === "long" && direction === "LONG") {
    rejectReason = funding.note;
  } else if (funding.crowded === "short" && direction === "SHORT") {
    rejectReason = funding.note;
  } else if (!entryCheck.ok) {
    rejectReason = entryCheck.reasons[0] ?? rejectReason;
  }

  return {
    symbol,
    coinId,
    pairLabel: formatPairLabel(symbol),
    status: "filtered",
    direction,
    confidence,
    setupGrade: displayGrade,
    trend15m: ind15.trend,
    rejectReason,
  };
}
