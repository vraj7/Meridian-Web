import { Injectable } from '@nestjs/common';
import {
  ADX,
  ATR,
  BollingerBands,
  EMA,
  MACD,
  RSI,
  SMA,
} from 'technicalindicators';
import type { DailyTrend, Kline } from '../../common/types';

export interface TrendAnalysis {
  trend: DailyTrend;
  ema50: number;
  ema200: number;
  price: number;
  adx: number;
  atr: number;
  atrSma100: number;
  atrRatio: number;
}

export interface Momentum4h {
  rsi: number;
  macdHistogram: number;
  macdCrossBullish: boolean;
  macdCrossBearish: boolean;
  score: number;
}

export interface CvdScore {
  score: number;
  bullishDivergence: boolean;
  bearishDivergence: boolean;
}

export interface TimeframeAnalysis {
  trend: DailyTrend;
  price: number;
  ema20: number;
  ema50: number;
  ema200: number;
  rsi: number;
  macdHistogram: number;
  macdCrossBullish: boolean;
  macdCrossBearish: boolean;
  adx: number;
  atr: number;
  atrRatio: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
  bbPosition: 'upper' | 'middle' | 'lower';
  volumeRatio: number;
  support: number;
  resistance: number;
}

export interface SuggestedEntry {
  price: number;
  kind: 'market' | 'limit';
  label: string;
}

export interface TimeframeScore {
  longScore: number;
  shortScore: number;
  longComponents: Record<string, number>;
  shortComponents: Record<string, number>;
}

@Injectable()
export class IndicatorsService {
  analyzeTimeframe(klines: Kline[]): TimeframeAnalysis | null {
    if (klines.length < 30) return null;

    const closes = klines.map((k) => k.close);
    const highs = klines.map((k) => k.high);
    const lows = klines.map((k) => k.low);
    const volumes = klines.map((k) => k.volume);
    const price = closes[closes.length - 1];

    const ema20Arr = EMA.calculate({ period: Math.min(20, closes.length - 1), values: closes });
    const ema50Arr = EMA.calculate({ period: Math.min(50, closes.length - 1), values: closes });
    const ema20 = ema20Arr[ema20Arr.length - 1] ?? price;
    const ema50 = ema50Arr[ema50Arr.length - 1] ?? price;
    // Only a true 200-EMA (needs >=200 bars); 0 signals "not enough history".
    const ema200Arr = closes.length >= 200 ? EMA.calculate({ period: 200, values: closes }) : [];
    const ema200 = ema200Arr[ema200Arr.length - 1] ?? 0;

    let trend: DailyTrend = 'sideways';
    if (price > ema20 && ema20 > ema50) trend = 'uptrend';
    else if (price < ema20 && ema20 < ema50) trend = 'downtrend';

    const rsiArr = RSI.calculate({ period: 14, values: closes });
    const rsi = rsiArr[rsiArr.length - 1] ?? 50;

    const macdArr = MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    });
    const lastMacd = macdArr[macdArr.length - 1];
    const prevMacd = macdArr[macdArr.length - 2];
    const macdHistogram = lastMacd?.histogram ?? 0;
    const macdCrossBullish =
      !!prevMacd &&
      !!lastMacd &&
      (prevMacd.MACD ?? 0) <= (prevMacd.signal ?? 0) &&
      (lastMacd.MACD ?? 0) > (lastMacd.signal ?? 0);
    const macdCrossBearish =
      !!prevMacd &&
      !!lastMacd &&
      (prevMacd.MACD ?? 0) >= (prevMacd.signal ?? 0) &&
      (lastMacd.MACD ?? 0) < (lastMacd.signal ?? 0);

    const adxArr = ADX.calculate({ high: highs, low: lows, close: closes, period: 14 });
    const adx = adxArr[adxArr.length - 1]?.adx ?? 0;

    const atrArr = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 });
    const atr = atrArr[atrArr.length - 1] ?? 0;
    const atrSma = SMA.calculate({ period: Math.min(50, atrArr.length), values: atrArr.slice(-50) });
    const atrRatio = (atrSma[atrSma.length - 1] ?? atr) > 0 ? atr / (atrSma[atrSma.length - 1] ?? atr) : 1;

    const bbArr = BollingerBands.calculate({ period: 20, stdDev: 2, values: closes });
    const bb = bbArr[bbArr.length - 1];
    const bbUpper = bb?.upper ?? price;
    const bbMiddle = bb?.middle ?? price;
    const bbLower = bb?.lower ?? price;
    let bbPosition: 'upper' | 'middle' | 'lower' = 'middle';
    if (price >= bbUpper * 0.998) bbPosition = 'upper';
    else if (price <= bbLower * 1.002) bbPosition = 'lower';

    const recentVol = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const priorVol = volumes.slice(-15, -5).reduce((a, b) => a + b, 0) / 10;
    const volumeRatio = priorVol > 0 ? recentVol / priorVol : 1;

    const swing = klines.slice(-20);
    const support = Math.min(...swing.map((k) => k.low));
    const resistance = Math.max(...swing.map((k) => k.high));

    return {
      trend,
      price,
      ema20,
      ema50,
      ema200,
      rsi,
      macdHistogram,
      macdCrossBullish,
      macdCrossBearish,
      adx,
      atr,
      atrRatio,
      bbUpper,
      bbMiddle,
      bbLower,
      bbPosition,
      volumeRatio,
      support,
      resistance,
    };
  }

  scoreTimeframe(
    tf: TimeframeAnalysis,
    higherTf: TimeframeAnalysis | null,
    macroTf: TimeframeAnalysis | null,
  ): TimeframeScore {
    const scoreSide = (direction: 'long' | 'short'): { total: number; parts: Record<string, number> } => {
      const parts: Record<string, number> = {};

      if (direction === 'long') {
        parts.trend = tf.trend === 'uptrend' ? 22 : tf.trend === 'sideways' ? 8 : 2;
        // Dominant 200-EMA bias: reward trading with the major trend, penalize fighting it.
        if (tf.ema200 > 0) parts.trend200 = tf.price > tf.ema200 ? 6 : -6;
        if (tf.rsi >= 45 && tf.rsi <= 68 && tf.macdHistogram > 0) parts.momentum = 18;
        else if (tf.rsi >= 40 && tf.macdHistogram > 0) parts.momentum = 12;
        else if (tf.macdHistogram > 0) parts.momentum = 8;
        else parts.momentum = 3;
        if (tf.macdCrossBullish) parts.momentum = Math.min(22, parts.momentum + 6);
        if (tf.rsi >= 70) parts.exhaustion = -12;
        else if (tf.rsi >= 65) parts.exhaustion = -6;
        parts.adx = tf.adx >= 25 ? 12 : tf.adx >= 18 ? 8 : tf.adx >= 12 ? 4 : 0;
        parts.volume = tf.volumeRatio >= 1.2 && tf.macdHistogram > 0 ? 8 : tf.volumeRatio >= 0.9 ? 5 : 2;
        parts.bollinger =
          tf.bbPosition === 'lower' ? 10 : tf.bbPosition === 'middle' ? 6 : tf.price < tf.bbMiddle ? 4 : 1;
        if (tf.bbPosition === 'upper' && tf.rsi >= 65) parts.bollinger = Math.min(parts.bollinger, 2);
        if (higherTf) {
          parts.higherTf =
            higherTf.trend === 'uptrend' ? 10 : higherTf.trend === 'sideways' ? 5 : higherTf.macdHistogram > 0 ? 4 : 0;
        } else parts.higherTf = 5;
        if (macroTf) {
          parts.macroTf =
            macroTf.trend === 'uptrend' ? 8 : macroTf.trend === 'sideways' ? 4 : macroTf.macdHistogram > 0 ? 3 : 0;
        } else parts.macroTf = 4;
      } else {
        parts.trend = tf.trend === 'downtrend' ? 22 : tf.trend === 'sideways' ? 8 : 2;
        // Dominant 200-EMA bias: reward shorting below the 200-EMA, penalize shorting above it.
        if (tf.ema200 > 0) parts.trend200 = tf.price < tf.ema200 ? 6 : -6;
        if (tf.rsi >= 32 && tf.rsi <= 55 && tf.macdHistogram < 0) parts.momentum = 18;
        else if (tf.rsi <= 60 && tf.macdHistogram < 0) parts.momentum = 12;
        else if (tf.macdHistogram < 0) parts.momentum = 8;
        else parts.momentum = 3;
        if (tf.macdCrossBearish) parts.momentum = Math.min(22, parts.momentum + 6);
        if (tf.rsi <= 30) parts.exhaustion = -12;
        else if (tf.rsi <= 35) parts.exhaustion = -6;
        parts.adx = tf.adx >= 25 ? 12 : tf.adx >= 18 ? 8 : tf.adx >= 12 ? 4 : 0;
        parts.volume = tf.volumeRatio >= 1.2 && tf.macdHistogram < 0 ? 8 : tf.volumeRatio >= 0.9 ? 5 : 2;
        parts.bollinger =
          tf.bbPosition === 'upper' ? 10 : tf.bbPosition === 'middle' ? 6 : tf.price > tf.bbMiddle ? 4 : 1;
        if (tf.bbPosition === 'lower' && tf.rsi <= 35) parts.bollinger = Math.min(parts.bollinger, 2);
        if (higherTf) {
          parts.higherTf =
            higherTf.trend === 'downtrend' ? 10 : higherTf.trend === 'sideways' ? 5 : higherTf.macdHistogram < 0 ? 4 : 0;
        } else parts.higherTf = 5;
        if (macroTf) {
          parts.macroTf =
            macroTf.trend === 'downtrend' ? 8 : macroTf.trend === 'sideways' ? 4 : macroTf.macdHistogram < 0 ? 3 : 0;
        } else parts.macroTf = 4;
      }

      if (tf.atrRatio > 1.6) parts.volatility = -8;
      else if (tf.atrRatio > 1.3) parts.volatility = -4;
      else parts.volatility = 0;

      const total = Math.max(
        0,
        Math.min(
          100,
          Object.values(parts).reduce((a, b) => a + b, 0),
        ),
      );
      return { total, parts };
    };

    const long = scoreSide('long');
    const short = scoreSide('short');
    return {
      longScore: long.total,
      shortScore: short.total,
      longComponents: long.parts,
      shortComponents: short.parts,
    };
  }

  computeSuggestedEntry(
    tf: TimeframeAnalysis,
    side: 'long' | 'short',
    marketPrice: number,
  ): SuggestedEntry {
    const now = marketPrice || tf.price;

    if (side === 'short') {
      const stretched = tf.rsi <= 35 || tf.bbPosition === 'lower';
      if (stretched) {
        const rally = tf.ema20 > now ? tf.ema20 : tf.resistance > now ? tf.resistance : 0;
        if (rally > now * 1.002) {
          return {
            price: rally,
            kind: 'limit',
            label: 'Limit short — wait for rally to EMA20 / resistance (don’t chase lows)',
          };
        }
      }
      if (tf.ema20 > now * 1.002) {
        return {
          price: tf.ema20,
          kind: 'limit',
          label: 'Limit short on rally to EMA20',
        };
      }
    } else {
      const stretched = tf.rsi >= 65 || tf.bbPosition === 'upper';
      if (stretched) {
        const dip = tf.ema20 < now ? tf.ema20 : tf.support < now ? tf.support : 0;
        if (dip > 0 && dip < now * 0.998) {
          return {
            price: dip,
            kind: 'limit',
            label: 'Limit long — wait for pullback to EMA20 / support (don’t chase highs)',
          };
        }
      }
      if (tf.ema20 < now * 0.998) {
        return {
          price: tf.ema20,
          kind: 'limit',
          label: 'Limit long on pullback to EMA20',
        };
      }
    }

    return {
      price: now,
      kind: 'market',
      label: 'Market — enter near current price after candle confirms',
    };
  }

  computeSlTpFromAtr(
    klines: Kline[],
    entry: number,
    direction: 'long' | 'short',
    atr: number,
  ): { stopLoss: number; takeProfit1: number; takeProfit2: number; riskReward1: number; riskReward2: number } {
    // Use the same 20-bar swing window as the displayed support/resistance so the
    // stop always sits just BEYOND that level rather than inside it.
    const recent = klines.slice(-20);
    const slBuffer = 0.0025;
    const atrMult = 1.2;

    if (direction === 'long') {
      const swingLow = Math.min(...recent.map((k) => k.low));
      const atrStop = entry - atr * atrMult;
      // Stop must clear both the swing-low support and the ATR floor.
      const stopLoss = Math.min(swingLow * (1 - slBuffer), atrStop);
      const risk = entry - stopLoss;
      return {
        stopLoss,
        takeProfit1: entry + risk * 2,
        takeProfit2: entry + risk * 3,
        riskReward1: 2,
        riskReward2: 3,
      };
    }

    const swingHigh = Math.max(...recent.map((k) => k.high));
    const atrStop = entry + atr * atrMult;
    // Stop must clear both the swing-high resistance and the ATR floor.
    const stopLoss = Math.max(swingHigh * (1 + slBuffer), atrStop);
    const risk = stopLoss - entry;
    return {
      stopLoss,
      takeProfit1: entry - risk * 2,
      takeProfit2: entry - risk * 3,
      riskReward1: 2,
      riskReward2: 3,
    };
  }

  buildEmaLine(klines: Kline[], period: number): { time: number; value: number }[] {
    const closes = klines.map((k) => k.close);
    // Only draw a real EMA: a 200-EMA on 120 bars is actually a ~120-EMA and is
    // misleading, so require enough history before emitting longer EMAs.
    if (closes.length < period) return [];
    const values = EMA.calculate({ period, values: closes });
    const offset = klines.length - values.length;
    return values.map((value, i) => ({
      time: Math.floor(klines[i + offset].openTime / 1000),
      value,
    }));
  }

  buildBollingerLines(klines: Kline[]): {
    upper: { time: number; value: number }[];
    middle: { time: number; value: number }[];
    lower: { time: number; value: number }[];
  } {
    const closes = klines.map((k) => k.close);
    const bbArr = BollingerBands.calculate({ period: 20, stdDev: 2, values: closes });
    const offset = klines.length - bbArr.length;
    const upper: { time: number; value: number }[] = [];
    const middle: { time: number; value: number }[] = [];
    const lower: { time: number; value: number }[] = [];
    bbArr.forEach((b, i) => {
      const time = Math.floor(klines[i + offset].openTime / 1000);
      upper.push({ time, value: b.upper });
      middle.push({ time, value: b.middle });
      lower.push({ time, value: b.lower });
    });
    return { upper, middle, lower };
  }

  analyzeDailyTrend(klines1d: Kline[]): TrendAnalysis {
    const closes = klines1d.map((k) => k.close);
    const highs = klines1d.map((k) => k.high);
    const lows = klines1d.map((k) => k.low);
    const price = closes[closes.length - 1];

    const ema50Period = Math.min(50, Math.max(closes.length - 1, 2));
    const ema200Period = Math.min(200, Math.max(closes.length - 1, 2));

    const ema50Arr = EMA.calculate({ period: ema50Period, values: closes });
    const ema200Arr = EMA.calculate({ period: ema200Period, values: closes });
    const ema50 = ema50Arr[ema50Arr.length - 1] ?? price;
    const ema200 = ema200Arr[ema200Arr.length - 1] ?? price;

    let trend: DailyTrend = 'sideways';
    if (price > ema50 && ema50 > ema200) trend = 'uptrend';
    else if (price < ema50 && ema50 < ema200) trend = 'downtrend';

    const adxArr = ADX.calculate({ high: highs, low: lows, close: closes, period: 14 });
    const adx = adxArr[adxArr.length - 1]?.adx ?? 0;

    const atrArr = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 });
    const atr = atrArr[atrArr.length - 1] ?? 0;
    const atrSma100 = SMA.calculate({ period: 100, values: atrArr.slice(-100) });
    const atrSma = (atrSma100[atrSma100.length - 1] ?? atr) || 1;
    const atrRatio = atrSma > 0 ? atr / atrSma : 1;

    return { trend, ema50, ema200, price, adx, atr, atrSma100: atrSma, atrRatio };
  }

  analyze4hMomentum(klines4h: Kline[]): Momentum4h {
    const closes = klines4h.map((k) => k.close);
    const rsiArr = RSI.calculate({ period: 14, values: closes });
    const rsi = rsiArr[rsiArr.length - 1] ?? 50;

    const macdArr = MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false,
    });
    const last = macdArr[macdArr.length - 1];
    const prev = macdArr[macdArr.length - 2];
    const histogram = last?.histogram ?? 0;
    const macdCrossBullish =
      !!prev && !!last && (prev.MACD ?? 0) <= (prev.signal ?? 0) && (last.MACD ?? 0) > (last.signal ?? 0);
    const macdCrossBearish =
      !!prev && !!last && (prev.MACD ?? 0) >= (prev.signal ?? 0) && (last.MACD ?? 0) < (last.signal ?? 0);

    let score = 0;
    if (rsi > 40 && rsi < 70 && histogram > 0) score += 10;
    if (rsi < 60 && rsi > 30 && histogram < 0) score += 10;
    if (macdCrossBullish) score += 10;
    if (macdCrossBearish) score += 10;
    score = Math.min(score, 20);

    return { rsi, macdHistogram: histogram, macdCrossBullish, macdCrossBearish, score };
  }

  /** Direction-aware 4H momentum (0–20). */
  score4hMomentum(m: Momentum4h, direction: 'long' | 'short'): number {
    let score = 0;
    if (direction === 'long') {
      if (m.rsi >= 42 && m.rsi <= 68 && m.macdHistogram > 0) score += 14;
      else if (m.rsi >= 38 && m.rsi <= 72) score += 7;
      else if (m.macdHistogram > 0) score += 6;
      if (m.macdCrossBullish) score += 8;
      else if (m.macdHistogram > 0) score += 5;
    } else {
      if (m.rsi >= 32 && m.rsi <= 58 && m.macdHistogram < 0) score += 14;
      else if (m.rsi >= 28 && m.rsi <= 62) score += 7;
      else if (m.macdHistogram < 0) score += 6;
      if (m.macdCrossBearish) score += 8;
      else if (m.macdHistogram < 0) score += 5;
    }
    return Math.min(score, 20);
  }

  /**
   * Score CVD for a direction using the CoinDCX trades snapshot.
   * (CoinDCX klines carry no taker-buy volume, so there is no kline-based CVD —
   * the trades snapshot from buildCvdSnapshot is the only source.)
   */
  scoreCvdForDirection(
    cvd: { bullishDivergence: boolean; bearishDivergence: boolean; netBuyRatio?: number } | null,
    direction: 'long' | 'short',
  ): CvdScore {
    const netBuyRatio = cvd?.netBuyRatio ?? 0;
    const bullish = cvd?.bullishDivergence ?? false;
    const bearish = cvd?.bearishDivergence ?? false;

    if (direction === 'long') {
      if (bullish) return { score: 15, bullishDivergence: true, bearishDivergence: false };
      if (netBuyRatio > 0.08) return { score: 12, bullishDivergence: false, bearishDivergence: false };
      if (netBuyRatio > 0.02) return { score: 9, bullishDivergence: false, bearishDivergence: false };
      if (bearish) return { score: 2, bullishDivergence: false, bearishDivergence: true };
      return { score: 6, bullishDivergence: false, bearishDivergence: false };
    }

    if (bearish) return { score: 15, bullishDivergence: false, bearishDivergence: true };
    if (netBuyRatio < -0.08) return { score: 12, bullishDivergence: false, bearishDivergence: false };
    if (netBuyRatio < -0.02) return { score: 9, bullishDivergence: false, bearishDivergence: false };
    if (bullish) return { score: 2, bullishDivergence: true, bearishDivergence: false };
    return { score: 6, bullishDivergence: false, bearishDivergence: false };
  }

  scoreOiChange(oiChangePct: number, direction: 'long' | 'short'): number {
    if (direction === 'long' && oiChangePct >= 2) return 15;
    if (direction === 'short' && oiChangePct <= -2) return 15;
    if (direction === 'long' && oiChangePct >= 1) return 12;
    if (direction === 'short' && oiChangePct <= -1) return 12;
    if (direction === 'long' && oiChangePct > 0.3) return 9;
    if (direction === 'short' && oiChangePct < -0.3) return 9;
    if (Math.abs(oiChangePct) < 0.5) return 7;
    return 8;
  }

  scoreFunding(
    current: number,
    average: number,
    direction: 'long' | 'short',
  ): number {
    const threshold = 0.0002;
    const diff = current - average;
    if (direction === 'long') {
      if (diff > threshold) return 3;
      if (diff < -threshold) return 12;
      return 8;
    }
    if (diff > threshold) return 12;
    if (diff < -threshold) return 3;
    return 8;
  }

  scoreDailyTrendAlignment(trend: DailyTrend, direction: 'long' | 'short'): number {
    if (direction === 'long' && trend === 'uptrend') return 20;
    if (direction === 'short' && trend === 'downtrend') return 20;
    if (trend === 'sideways') return 5;
    return 2;
  }

  scoreNews(positive: number, negative: number, direction: 'long' | 'short'): number {
    if (direction === 'long' && positive > negative + 2) return 10;
    if (direction === 'short' && negative > positive + 2) return 10;
    return 5;
  }

  volatilityPenalty(atrRatio: number): number {
    if (atrRatio > 1.5) return -10;
    if (atrRatio < 0.7) return -3;
    return 0;
  }

  computeSlTp(
    klines1h: Kline[],
    entry: number,
    direction: 'long' | 'short',
    atrRatio: number,
  ): { stopLoss: number; takeProfit1: number; takeProfit2: number; riskReward1: number; riskReward2: number } {
    const recent = klines1h.slice(-10);
    const slBuffer = 0.003;
    const slMultiplier = atrRatio > 1.5 ? 1.3 : 1;

    let stopLoss: number;
    if (direction === 'long') {
      const lowest = Math.min(...recent.map((k) => k.low));
      stopLoss = lowest * (1 - slBuffer);
      const risk = (entry - stopLoss) * slMultiplier;
      stopLoss = entry - risk;
      const tp1 = entry + 2 * risk;
      const tp2 = entry + 3 * risk;
      return { stopLoss, takeProfit1: tp1, takeProfit2: tp2, riskReward1: 2, riskReward2: 3 };
    }

    const highest = Math.max(...recent.map((k) => k.high));
    stopLoss = highest * (1 + slBuffer);
    const risk = (stopLoss - entry) * slMultiplier;
    stopLoss = entry + risk;
    const tp1 = entry - 2 * risk;
    const tp2 = entry - 3 * risk;
    return { stopLoss, takeProfit1: tp1, takeProfit2: tp2, riskReward1: 2, riskReward2: 3 };
  }
}
