import { MIN_CONFIDENCE_DEFAULT } from "@/config/api";
import { formatPairLabel, type CryptoQuotePair } from "@/config/market";
import { generateId } from "@/lib/utils";
import type {
  Candle,
  FuturesMetrics,
  IndicatorSnapshot,
  SentimentData,
  SignalAction,
  Timeframe,
  TradeType,
  TradingSignal,
} from "@/types";
import { resolveEntryTiming } from "./entry-timing-engine";
import { computeIndicators, detectCandlestickPattern, findSupportResistance, higherTimeframeBias } from "./indicators";
import {
  buildInvalidation,
  buildOneLiner,
  buildWhyBuy,
  buildWhySell,
  detectCryptoRegime,
  getCryptoEntryWindow,
  gradeSignal,
  isHtfAligned,
  timeframeStyleLabel,
  resolveMarketTrend,
  HIGHER_TIMEFRAME,
} from "./crypto-timing-engine";
import {
  applyWarningPenalty,
  buildContextualCommentary,
  buildSmartWarnings,
  classifyTradeQuality,
  computeConfidence,
  confidenceBand,
  recommendExecution,
  type ScoreContext,
} from "./trade-quality-engine";
import {
  classifyTradingStyles,
  tradingStyleToTradeType,
} from "./trading-style-engine";

interface ScoreBreakdown {
  bullish: number;
  bearish: number;
  confidence: number;
  risk: number;
  confirmations: string[];
  warnings: string[];
}

function scoreIndicators(ind: IndicatorSnapshot, price: number, candles: Candle[]): ScoreBreakdown {
  let bullish = 0;
  let bearish = 0;
  const confirmations: string[] = [];
  const warnings: string[] = [];

  if (ind.rsi < 30) { bullish += 15; confirmations.push("RSI oversold"); }
  else if (ind.rsi > 70) { bearish += 15; confirmations.push("RSI overbought"); }
  else if (ind.rsi > 55) bullish += 6;
  else if (ind.rsi < 45) bearish += 6;

  if (ind.macd.histogram > 0 && ind.macd.macd > ind.macd.signal) {
    bullish += 12;
    confirmations.push("MACD bullish crossover");
  } else if (ind.macd.histogram < 0 && ind.macd.macd < ind.macd.signal) {
    bearish += 12;
    confirmations.push("MACD bearish crossover");
  }

  if (ind.ema9 > ind.ema21 && ind.ema21 > ind.ema50) {
    bullish += 15;
    confirmations.push("EMA bullish alignment (9>21>50)");
  } else if (ind.ema9 < ind.ema21 && ind.ema21 < ind.ema50) {
    bearish += 15;
    confirmations.push("EMA bearish alignment (9<21<50)");
  }

  if (price < ind.bb.lower) { bullish += 10; confirmations.push("Price below lower Bollinger Band"); }
  if (price > ind.bb.upper) { bearish += 10; confirmations.push("Price above upper Bollinger Band"); }

  if (price > ind.vwap) { bullish += 6; confirmations.push("Price above VWAP"); }
  else { bearish += 6; confirmations.push("Price below VWAP"); }

  if (ind.stochRsi < 20) bullish += 8;
  if (ind.stochRsi > 80) bearish += 8;

  if (ind.trend === "bullish") bullish += ind.trendStrength * 0.25;
  if (ind.trend === "bearish") bearish += ind.trendStrength * 0.25;

  if (ind.adx >= 25) {
    confirmations.push(`Strong trend (ADX ${ind.adx.toFixed(0)})`);
    if (ind.trend === "bullish") bullish += 10;
    if (ind.trend === "bearish") bearish += 10;
  } else if (ind.adx < 18) {
    warnings.push(`Weak trend (ADX ${ind.adx.toFixed(0)}) — choppy market, avoid breakout trades`);
  }

  if (ind.volumeSpike >= 1.6) {
    confirmations.push(`Volume spike ${ind.volumeSpike.toFixed(1)}× average`);
    if (ind.trend === "bullish") bullish += 8;
    if (ind.trend === "bearish") bearish += 8;
  } else if (ind.volumeSpike < 0.6) {
    warnings.push("Low volume — move may not sustain");
  }

  // Range-position context
  if (ind.rangePosition < 25) bullish += 4;
  if (ind.rangePosition > 75) bearish += 4;

  // Volatility-based risk
  const atrPct = (ind.atr / price) * 100;
  const risk = atrPct > 5 ? 75 : atrPct > 3 ? 50 : 28;

  if (ind.rsi > 47 && ind.rsi < 53) warnings.push("RSI in dead zone (47–53) — momentum unclear");

  // Penalize counter-trend setups in strong trends
  if (ind.adx >= 28 && ind.trend === "bullish" && bearish > bullish) {
    warnings.push("Counter-trend short in strong uptrend — reduce conviction");
    bearish *= 0.7;
  }
  if (ind.adx >= 28 && ind.trend === "bearish" && bullish > bearish) {
    warnings.push("Counter-trend long in strong downtrend — reduce conviction");
    bullish *= 0.7;
  }

  void candles;
  const total = bullish + bearish;
  const confidence = total > 0 ? (Math.max(bullish, bearish) / total) * 100 : 0;

  return { bullish, bearish, confidence, risk, confirmations, warnings };
}

function scoreSentiment(sentiment?: SentimentData): { bull: number; bear: number; conf: string[] } {
  if (!sentiment) return { bull: 0, bear: 0, conf: [] };
  const conf: string[] = [];
  let bull = 0;
  let bear = 0;
  if (sentiment.overall > 0.15) { bull += 10; conf.push("Positive market sentiment / news"); }
  if (sentiment.overall < -0.15) { bear += 10; conf.push("Negative market sentiment / news"); }
  if (sentiment.fearGreed < 25) { bull += 8; conf.push(`Extreme fear (${sentiment.fearGreed}) — contrarian bullish`); }
  if (sentiment.fearGreed > 75) { bear += 8; conf.push(`Extreme greed (${sentiment.fearGreed}) — caution`); }
  return { bull, bear, conf };
}

function scoreFutures(futures?: FuturesMetrics): { bull: number; bear: number; conf: string[]; warn: string[] } {
  if (!futures) return { bull: 0, bear: 0, conf: [], warn: [] };
  const conf: string[] = [];
  const warn: string[] = [];
  let bull = 0;
  let bear = 0;

  if (futures.fundingRate < -0.005) { bull += 8; conf.push("Negative funding — shorts pay longs (long bias)"); }
  if (futures.fundingRate > 0.005) { bear += 8; conf.push("Positive funding — longs pay shorts (short bias)"); }
  if (futures.squeezeRisk === "short") { bull += 12; conf.push("Short squeeze risk — bullish"); }
  if (futures.squeezeRisk === "long") { bear += 12; conf.push("Long squeeze risk — bearish"); }
  if (futures.volatilityAlert) warn.push("Funding-rate volatility spike — reduce size");
  if (futures.longShortRatio > 1.8) warn.push("Crowded longs — flush risk");
  if (futures.longShortRatio < 0.55) warn.push("Crowded shorts — squeeze risk");

  return { bull, bear, conf, warn };
}

export function generateSignal(params: {
  symbol: string;
  coinId: string;
  candles: Candle[];
  /** Optional higher-timeframe candles for multi-timeframe confirmation. */
  higherTimeframeCandles?: Candle[];
  timeframe: Timeframe;
  market: "spot" | "futures" | "india_equity" | "india_futures" | "india_options";
  tradeType?: TradeType;
  sentiment?: SentimentData;
  futures?: FuturesMetrics;
  minConfidence?: number;
  /** Override default trade-eligibility gates (confirmations count, min R:R). */
  minConfirmations?: number;
  minRiskReward?: number;
  /** Return grade + WAIT even when below trade filters (for coin lists). */
  includeWeak?: boolean;
  /** Softer penalties; keep directional action when setup is forming. */
  relaxed?: boolean;
  /** BTC/USD vs BTC/USDT label and display. */
  quotePair?: CryptoQuotePair;
}): TradingSignal | null {
  const {
    symbol,
    coinId,
    candles,
    higherTimeframeCandles,
    timeframe,
    market,
    quotePair = "USD",
    tradeType =
      market === "futures"
        ? "futures_long"
        : market === "india_futures"
          ? "india_futures_long"
          : market === "india_equity"
            ? "india_cash"
            : market === "india_options"
              ? "india_options"
              : "spot",
    sentiment,
    futures,
    minConfidence = MIN_CONFIDENCE_DEFAULT,
    minConfirmations = 3,
    minRiskReward = 1.4,
    includeWeak = false,
    relaxed = false,
  } = params;

  if (candles.length < 50) return null;

  const indicators = computeIndicators(candles);
  const price = candles[candles.length - 1].close;
  const { support, resistance } = findSupportResistance(candles);
  const patterns = detectCandlestickPattern(candles);

  const indScore = scoreIndicators(indicators, price, candles);
  const sentScore = scoreSentiment(sentiment);
  const futScore = scoreFutures(futures);

  let bullish = indScore.bullish + sentScore.bull + futScore.bull;
  let bearish = indScore.bearish + sentScore.bear + futScore.bear;

  // Higher timeframe alignment bonus / counter-trend penalty
  const htfBias = higherTimeframeCandles ? higherTimeframeBias(higherTimeframeCandles) : "ranging";
  if (htfBias === "uptrend") bullish *= 1.15;
  if (htfBias === "downtrend") bearish *= 1.15;

  const confirmations = [
    ...indScore.confirmations,
    ...sentScore.conf,
    ...futScore.conf,
    ...patterns.map((p) => `Candlestick: ${p}`),
  ];
  const warnings = [...indScore.warnings, ...futScore.warn];

  if (htfBias !== "ranging") confirmations.push(`Higher timeframe ${htfBias}`);

  const total = bullish + bearish;
  let confidence = total > 0 ? (Math.max(bullish, bearish) / total) * 100 : 0;
  // Multi-confirmation prior — the new component-weighted model will overwrite
  // this once regime + S/R + alignment are known. Kept for legacy bull/bear gates.
  confidence = Math.min(95, confidence * (confirmations.length >= 3 ? 1.05 : 0.9));

  const isBullish = bullish > bearish;

  // Regime detection (used for filtering and explanation)
  const regimeInfo = detectCryptoRegime(indicators, price, htfBias);

  // ATR-based levels
  const atr = indicators.atr || price * 0.02;
  let stopMult = 1.5;
  let tpMult = 2.5;
  let trailMult = 1.0;
  if (regimeInfo.regime === "high_volatility") {
    stopMult = 2.2;
    tpMult = 3.5;
    trailMult = 1.5;
  } else if (regimeInfo.regime === "ranging") {
    stopMult = 1.0;
    tpMult = 1.5;
    trailMult = 0.7;
  } else if (regimeInfo.regime === "strong_uptrend" || regimeInfo.regime === "strong_downtrend") {
    stopMult = 1.5;
    tpMult = 3.0;
    trailMult = 1.2;
  }

  // Entry zone is always positioned to favor a BETTER fill:
  //   LONG  → small dip below current price (buy the dip)
  //   SHORT → small rally above current price (sell the rally)
  // The previous SHORT zone was inverted (placed below current price), which
  // contradicted "sell the rally" semantics.
  const entryLow = isBullish
    ? price - atr * 0.3
    : price - atr * 0.1;
  const entryHigh = isBullish
    ? price + atr * 0.1
    : price + atr * 0.3;
  const stopLoss = isBullish ? price - atr * stopMult : price + atr * stopMult;
  const takeProfit = isBullish ? price + atr * tpMult : price - atr * tpMult;
  const takeProfit2 = isBullish
    ? price + atr * (tpMult * 1.6)
    : price - atr * (tpMult * 1.6);
  const trailingStop = isBullish ? price - atr * trailMult : price + atr * trailMult;
  const riskReward =
    Math.abs(takeProfit - price) / Math.max(0.0001, Math.abs(price - stopLoss));

  const tradeEligible =
    confidence >= minConfidence &&
    confirmations.length >= minConfirmations &&
    riskReward >= minRiskReward;

  if (!tradeEligible && !includeWeak) return null;

  const nearestSupport = support[0] ?? price * 0.97;
  const nearestResistance = resistance[0] ?? price * 1.03;

  const htfBiasForStyle = higherTimeframeCandles
    ? higherTimeframeBias(higherTimeframeCandles)
    : ("ranging" as const);

  const styleEligible =
    market === "spot" ||
    market === "futures" ||
    market === "india_equity" ||
    market === "india_futures";

  const tradingStyleAnalysis = styleEligible
    ? classifyTradingStyles({
        candles,
        indicators,
        timeframe,
        price,
        isBullish,
        htfBias: htfBiasForStyle,
        support,
        resistance,
        patterns,
      })
    : undefined;

  // -------------------------------------------------------------------------
  // Pro-grade weighted confidence + smart warnings (overrides bull/bear ratio)
  // -------------------------------------------------------------------------
  const isCrypto = market === "spot" || market === "futures";
  const higherTfForTrend = HIGHER_TIMEFRAME[timeframe];
  const trendInfo = isCrypto
    ? resolveMarketTrend({
        indicators,
        htfBias,
        timeframe,
        higherTf: higherTfForTrend,
        candles,
      })
    : null;
  // Highest TF = one step above the higher TF (or higher TF if already top).
  const highestTfTrend = trendInfo
    ? HIGHER_TIMEFRAME[higherTfForTrend] === higherTfForTrend
      ? trendInfo.higherTfTrend
      : trendInfo.higherTfTrend
    : undefined;

  const scoreCtx: ScoreContext = {
    isBullish,
    price,
    indicators,
    chartTrend: trendInfo?.chartTrend ?? (isBullish ? "Uptrend" : "Downtrend"),
    higherTfTrend: trendInfo?.higherTfTrend ?? "Sideways",
    highestTfTrend,
    regime: regimeInfo.regime,
    nearestSupport,
    nearestResistance,
    sentiment,
    futures,
    candles,
    riskReward,
    isFutures: market === "futures",
  };

  const legacyConfidence = confidence;
  const smartWarnings = isCrypto ? buildSmartWarnings(scoreCtx) : [];
  const confCalc = computeConfidence(scoreCtx);
  if (isCrypto) {
    const penalized = applyWarningPenalty(confCalc.confidence, smartWarnings, relaxed);
    confidence = Math.round(
      Math.max(legacyConfidence * (relaxed ? 0.9 : 0.82), penalized)
    );
    confidence = Math.min(95, Math.max(relaxed ? 38 : 32, confidence));
  }
  const winProbability = isCrypto
    ? confCalc.winProbability
    : Math.round(Math.max(35, Math.min(78, confidence * 0.8)));
  const alignment = confCalc.alignment;

  // Push smart warnings as plain strings too (legacy `warnings` consumers).
  for (const w of smartWarnings) {
    if (!warnings.includes(w.message)) warnings.push(w.message);
  }

  // Action label
  let action: SignalAction;
  const isFuturesMarket = market === "futures" || market === "india_futures";
  const isCashMarket = market === "spot" || market === "india_equity";

  const wantsLong =
    tradeType === "futures_long" || tradeType === "india_futures_long";
  const wantsShort =
    tradeType === "futures_short" || tradeType === "india_futures_short";

  if (isFuturesMarket) {
    action = isBullish ? "STRONG LONG" : "STRONG SHORT";
  } else if (isBullish) {
    action = confidence >= 80 ? "STRONG LONG" : "BUY NOW";
  } else {
    action = confidence >= 80 ? "STRONG SHORT" : "SELL NOW";
  }

  if (wantsLong && !isBullish) {
    action = "WAIT";
    warnings.push("Indicators favor SHORT — not a long setup");
  }
  if (wantsShort && isBullish) {
    action = "WAIT";
    warnings.push("Indicators favor LONG — not a short setup");
  }

  const isCryptoMarket = market === "spot" || market === "futures";
  if (!isBullish && isCashMarket && !isCryptoMarket && confidence < minConfidence + 5) {
    action = "WAIT";
  }
  if (isBullish && bearish > bullish * 0.7) {
    action = "WAIT";
    warnings.push("Mixed signals — wait for confirmation");
  }
  if (regimeInfo.regime === "ranging" && action !== "WAIT" && !isCryptoMarket) {
    if (confidence < minConfidence + 5) {
      action = "WAIT";
    }
  }

  if (!tradeEligible) {
    action = "WAIT";
    if (!includeWeak) return null;
    warnings.push("Below trade threshold — grade only, not a live entry");
  }

  const riskScoreRaw =
    indScore.risk +
    (futures?.volatilityAlert ? 15 : 0) +
    (regimeInfo.regime === "high_volatility" ? 20 : 0) +
    (regimeInfo.regime === "ranging" ? 10 : 0) -
    (isHtfAligned(higherTimeframeCandles, isBullish) ? 10 : 0);
  const riskScore = Math.max(5, Math.min(100, riskScoreRaw));

  let suggestedLeverage = "1x (spot)";
  if (market === "futures") {
    if (riskScore > 60) suggestedLeverage = "2-3x max (high risk)";
    else if (riskScore > 40) suggestedLeverage = "3-5x (moderate)";
    else suggestedLeverage = "5-10x (low vol only)";
  } else if (market === "india_futures") {
    suggestedLeverage = "NSE F&O lot size — capital at risk";
  } else if (market === "india_equity") {
    suggestedLeverage = "Delivery / MIS (cash segment)";
  }

  // Suggested capital risk per trade based on confidence + regime
  let capitalRiskPercent = 1;
  if (riskScore > 65) capitalRiskPercent = 0.5;
  else if (confidence >= 80 && riskScore < 45) capitalRiskPercent = 1.5;
  if (regimeInfo.regime === "ranging" || regimeInfo.regime === "high_volatility") {
    capitalRiskPercent = Math.min(capitalRiskPercent, 0.5);
  }

  const htfAligned = isHtfAligned(higherTimeframeCandles, isBullish);

  // Legacy A/B/C grade — kept for older UI consumers.
  const quality = gradeSignal({
    confidence,
    confirmations: confirmations.length,
    regime: regimeInfo.regime,
    htfAligned,
    riskReward,
    volumeConfirmed: indicators.volumeSpike >= 1.4,
    warningsCount: warnings.length,
  });

  // New pro-grade A+/A/B/C/D classification.
  const tfBucket: "scalp" | "intraday" | "swing" =
    timeframe === "1m" || timeframe === "5m"
      ? "scalp"
      : timeframe === "4h" || timeframe === "1D" || timeframe === "1W"
        ? "swing"
        : "intraday";
  const tradeQuality = isCrypto
    ? classifyTradeQuality({
        confidence,
        winProbability,
        riskReward,
        alignment,
        warnings: smartWarnings,
        isBullish,
        indicators,
        highestTfTrend,
        timeframe: tfBucket,
      })
    : (quality === "A" ? "A" : quality === "B" ? "B" : "C");
  const band = confidenceBand(confidence);

  const whyBuy = isBullish ? buildWhyBuy(indicators, regimeInfo.regime, htfAligned) : [];
  const whySell = !isBullish ? buildWhySell(indicators, regimeInfo.regime, htfAligned) : [];
  const invalidation = buildInvalidation(isBullish, indicators, stopLoss);
  const oneLiner = buildOneLiner(isBullish ? "Buy" : "Sell", regimeInfo.regime, htfAligned);

  // Best entry window — only meaningful for crypto
  const entryWindow = isCrypto ? getCryptoEntryWindow() : null;
  const idealEntryWindow = entryWindow
    ? `${entryWindow.label}${entryWindow.inWindow ? " · live now" : " · prefer waiting"}`
    : undefined;

  if (entryWindow && !entryWindow.inWindow && quality === "C") {
    warnings.push("Outside high-liquidity window — fakeouts more likely");
  }

  if (
    regimeInfo.regime === "ranging" ||
    regimeInfo.regime === "high_volatility"
  ) {
    warnings.push(`Regime: ${regimeInfo.label} — ${regimeInfo.note}`);
  }

  const entryZone: [number, number] = [Math.min(entryLow, entryHigh), Math.max(entryLow, entryHigh)];
  const entryTiming = resolveEntryTiming({
    isBullish,
    currentPrice: price,
    entryZone,
    action,
  });
  if (entryTiming.suggestWaitForPrice) {
    warnings.push("Price outside entry zone — wait for target price before entering");
  }

  // Execution-mode recommendation (aggressive / conservative / wait / avoid / scale-in / capital-preservation)
  const execRec = isCrypto
    ? recommendExecution({
        isBullish,
        inZone: entryTiming.status === "in_zone",
        distanceToEntryPct: entryTiming.distanceToEntryPct ?? 0,
        indicators,
        price,
        regime: regimeInfo.regime,
        quality: tradeQuality,
        confidence,
        warnings: smartWarnings,
        entryZone,
        stopLoss,
      })
    : null;

  // Action downgrade — never show "STRONG" if quality isn't there.
  if (action !== "WAIT") {
    const tooWeakForStrong =
      tradeQuality === "C" || tradeQuality === "D" || confidence < 70;
    if (tooWeakForStrong) {
      if (action === "STRONG LONG") action = "BUY NOW";
      if (action === "STRONG SHORT") action = "SELL NOW";
    }
    const forceWait =
      tradeQuality === "D" ||
      confidence < (relaxed ? 38 : 48) ||
      (!relaxed && execRec?.capitalPreservation);
    if (forceWait) {
      action = "WAIT";
    }
  }

  // Contextual commentary
  let resolvedTradeType: TradeType = tradeType;
  if (tradingStyleAnalysis && market === "spot" && tradeType === "spot") {
    resolvedTradeType = tradingStyleToTradeType(tradingStyleAnalysis.primary, "spot");
  }
  if (tradingStyleAnalysis && tradingStyleAnalysis.primaryScore >= 45) {
    confirmations.unshift(
      `Style: ${tradingStyleAnalysis.primaryLabel} (${tradingStyleAnalysis.primaryScore}% match)`
    );
    if (tradingStyleAnalysis.secondary && tradingStyleAnalysis.secondaryScore) {
      confirmations.push(
        `Secondary style: ${tradingStyleAnalysis.secondaryLabel} (${tradingStyleAnalysis.secondaryScore}%)`
      );
    }
    for (const reason of tradingStyleAnalysis.scores[0]?.reasons.slice(0, 2) ?? []) {
      if (!confirmations.includes(reason)) confirmations.push(reason);
    }
  }

  const contextualCommentary = isCrypto
    ? buildContextualCommentary({
        isBullish,
        alignment,
        quality: tradeQuality,
        confidence,
        winProbability,
        riskReward,
        regime: regimeInfo.regime,
        executionMode: execRec?.mode ?? "conservative",
        warnings: smartWarnings,
        indicators,
        price,
        symbol,
      })
    : undefined;

  return {
    id: generateId(),
    symbol,
    pairLabel: formatPairLabel(symbol, quotePair),
    coinId,
    action,
    tradeType: resolvedTradeType,
    confidence: Math.round(confidence),
    bullishScore: Math.round(bullish),
    bearishScore: Math.round(bearish),
    riskScore: Math.round(riskScore),
    entryZone,
    exitZone: isBullish ? [nearestResistance, takeProfit] : [takeProfit, nearestSupport],
    stopLoss,
    takeProfit,
    takeProfit2,
    trailingStop,
    riskReward: Math.round(riskReward * 100) / 100,
    suggestedLeverage,
    durationEstimate: tradingStyleAnalysis
      ? `${tradingStyleAnalysis.primaryLabel} · ${tradingStyleAnalysis.suggestedHold}`
      : timeframeStyleLabel(timeframe),
    bestTimeframe: timeframe,
    confirmations,
    warnings,
    timestamp: Date.now(),
    market,
    currentPrice: price,
    quality,
    winProbability,
    whyBuy,
    whySell,
    invalidation,
    idealEntryWindow,
    regime: regimeInfo.regime,
    oneLiner,
    capitalRiskPercent,
    chartTrend: trendInfo?.chartTrend,
    higherTfTrend: trendInfo?.higherTfTrend,
    overallTrend: trendInfo?.overallTrend,
    trendSummary: trendInfo?.trendSummary,
    trendDetail: trendInfo?.trendDetail,
    entryTimingStatus: entryTiming.status,
    waitForPrice: entryTiming.waitForPrice,
    idealEntryPrice: entryTiming.idealEntryPrice,
    entryTimingNote: entryTiming.entryTimingNote,
    suggestWaitForPrice: entryTiming.suggestWaitForPrice,
    distanceToEntryPct: entryTiming.distanceToEntryPct,
    tradeQuality,
    confidenceBand: band,
    executionMode: execRec?.mode,
    executionPlan: execRec?.plan,
    capitalPreservationMode: execRec?.capitalPreservation,
    trendAlignment: alignment,
    structuredWarnings: smartWarnings,
    winProbabilityBreakdown: confCalc.breakdown,
    aiCommentary: contextualCommentary,
    tradingStyle: tradingStyleAnalysis,
  };
}

export function rankSignals(signals: TradingSignal[]): TradingSignal[] {
  // Trade quality A+/A/B/C/D first, then legacy quality, then confidence.
  const tqOrder: Record<string, number> = { "A+": 5, A: 4, B: 3, C: 2, D: 1 };
  const qOrder: Record<string, number> = { A: 3, B: 2, C: 1 };
  return [...signals].sort((a, b) => {
    const ta = tqOrder[a.tradeQuality ?? "C"] ?? 2;
    const tb = tqOrder[b.tradeQuality ?? "C"] ?? 2;
    if (ta !== tb) return tb - ta;
    const qa = qOrder[a.quality ?? "C"];
    const qb = qOrder[b.quality ?? "C"];
    if (qa !== qb) return qb - qa;
    return b.confidence - a.confidence;
  });
}
