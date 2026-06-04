import {
  calcADX,
  calcATR,
  calcBollinger,
  calcMACD,
  calcRSI,
  calcStochRSI,
  calcVWAP,
  calcVolumeSpike,
} from "@/engines/indicators";
import type { Candle, MarketTrendLabel } from "@/types";
import type { ExtendedIndicatorSet } from "@/types/futures-intraday";

function ema(values: number[], period: number): number {
  const k = 2 / (period + 1);
  let prev = values[0] ?? 0;
  for (let i = 1; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
  }
  return prev;
}

function calcDMI(candles: Candle[], period = 14): { plusDi: number; minusDi: number } {
  if (candles.length < period + 2) return { plusDi: 0, minusDi: 0 };
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const tr: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const p = candles[i - 1];
    tr.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)));
    const up = c.high - p.high;
    const down = p.low - c.low;
    plusDM.push(up > down && up > 0 ? up : 0);
    minusDM.push(down > up && down > 0 ? down : 0);
  }
  const sum = (arr: number[], n: number) => arr.slice(-n).reduce((a, b) => a + b, 0);
  const trSum = sum(tr, period) || 1;
  return {
    plusDi: (sum(plusDM, period) / trSum) * 100,
    minusDi: (sum(minusDM, period) / trSum) * 100,
  };
}

function calcMomentum(closes: number[], period = 10): number {
  if (closes.length <= period) return 0;
  const last = closes[closes.length - 1];
  const prev = closes[closes.length - 1 - period];
  return prev ? ((last - prev) / prev) * 100 : 0;
}

function calcObvSlope(candles: Candle[]): number {
  let obv = 0;
  const series: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const p = candles[i - 1];
    if (c.close > p.close) obv += c.volume;
    else if (c.close < p.close) obv -= c.volume;
    series.push(obv);
  }
  if (series.length < 10) return 0;
  const recent = series.slice(-10);
  return recent[recent.length - 1] - recent[0];
}

function calcKeltner(candles: Candle[], period = 20, mult = 1.5): ExtendedIndicatorSet["keltner"] {
  const closes = candles.map((c) => c.close);
  const mid = ema(closes, period);
  const atr = calcATR(candles, period);
  return { upper: mid + atr * mult, middle: mid, lower: mid - atr * mult };
}

export function trendFromEmas(
  price: number,
  ema9: number,
  ema20: number,
  ema50: number,
  adx: number
): MarketTrendLabel {
  if (adx < 18) return "Sideways";
  if (price > ema9 && ema9 > ema20 && ema20 > ema50) return "Uptrend";
  if (price < ema9 && ema9 < ema20 && ema20 < ema50) return "Downtrend";
  if (price > ema50 && ema20 > ema50) return "Uptrend";
  if (price < ema50 && ema20 < ema50) return "Downtrend";
  return "Sideways";
}

export function computeExtendedIndicators(candles: Candle[]): ExtendedIndicatorSet | null {
  if (candles.length < 60) return null;
  const closes = candles.map((c) => c.close);
  const price = closes[closes.length - 1];
  const ema9 = ema(closes, 9);
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const ema100 = ema(closes, 100);
  const ema200 = ema(closes, 200);
  const adx = calcADX(candles);
  const dmi = calcDMI(candles);
  const bb = calcBollinger(closes);
  const keltner = calcKeltner(candles);

  return {
    ema9,
    ema20,
    ema50,
    ema100,
    ema200,
    rsi: calcRSI(closes),
    macd: calcMACD(closes),
    stochRsi: calcStochRSI(closes),
    momentum: calcMomentum(closes),
    adx,
    plusDi: dmi.plusDi,
    minusDi: dmi.minusDi,
    atr: calcATR(candles),
    bb,
    keltner,
    vwap: calcVWAP(candles.slice(-50)),
    relativeVolume: calcVolumeSpike(candles),
    obvSlope: calcObvSlope(candles),
    trend: trendFromEmas(price, ema9, ema20, ema50, adx),
  };
}
