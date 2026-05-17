import type { Candle, IndicatorSnapshot } from "@/types";

function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  let prev = values[0];
  result.push(prev);
  for (let i = 1; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    result.push(prev);
  }
  return result;
}

function sma(values: number[], period: number): number {
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

/**
 * RSI with Wilder's smoothing — matches TradingView/Binance.
 *
 * Note: the previous implementation used a simple mean over the last 14 bars,
 * which produced jumpy values that disagreed with charts.
 */
export function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function calcMACD(closes: number[]): { macd: number; signal: number; histogram: number } {
  const ema12 = ema(closes, 12);
  const ema26 = ema(closes, 26);
  const macdLine = ema12.map((v, i) => v - ema26[i]);
  const signalLine = ema(macdLine, 9);
  const macd = macdLine[macdLine.length - 1];
  const signal = signalLine[signalLine.length - 1];
  return { macd, signal, histogram: macd - signal };
}

export function calcBollinger(closes: number[], period = 20): { upper: number; middle: number; lower: number } {
  const middle = sma(closes, period);
  const slice = closes.slice(-period);
  const variance = slice.reduce((s, v) => s + (v - middle) ** 2, 0) / period;
  const std = Math.sqrt(variance);
  return { upper: middle + 2 * std, middle, lower: middle - 2 * std };
}

/**
 * Average True Range with Wilder's smoothing (matches charts).
 *
 * Previously used a simple mean — values were close, but jumpy when one
 * volatile bar exited the 14-bar window.
 */
export function calcATR(candles: Candle[], period = 14): number {
  if (candles.length < period + 1) return 0;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    trs.push(
      Math.max(
        c.high - c.low,
        Math.abs(c.high - prev.close),
        Math.abs(c.low - prev.close)
      )
    );
  }
  if (trs.length < period) return trs.reduce((a, b) => a + b, 0) / trs.length;
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }
  return atr;
}

export function calcVWAP(candles: Candle[]): number {
  let cumVol = 0;
  let cumPV = 0;
  candles.forEach((c) => {
    const typical = (c.high + c.low + c.close) / 3;
    cumPV += typical * c.volume;
    cumVol += c.volume;
  });
  return cumVol > 0 ? cumPV / cumVol : candles[candles.length - 1]?.close ?? 0;
}

export function calcStochRSI(closes: number[]): number {
  const rsiSeries: number[] = [];
  for (let i = 15; i <= closes.length; i++) {
    rsiSeries.push(calcRSI(closes.slice(0, i)));
  }
  if (rsiSeries.length < 14) return 50;
  const min = Math.min(...rsiSeries.slice(-14));
  const max = Math.max(...rsiSeries.slice(-14));
  const current = rsiSeries[rsiSeries.length - 1];
  if (max === min) return 50;
  return ((current - min) / (max - min)) * 100;
}

/**
 * Detect swing highs/lows using fractal pivots (2 bars on each side) and
 * cluster nearby levels so we don't return three near-identical prices.
 * Returns support sorted nearest-above-low first, resistance nearest-below-high first.
 */
export function findSupportResistance(
  candles: Candle[]
): { support: number[]; resistance: number[] } {
  if (candles.length < 5) return { support: [], resistance: [] };

  const highs: number[] = [];
  const lows: number[] = [];

  for (let i = 2; i < candles.length - 2; i++) {
    const c = candles[i];
    const isSwingHigh =
      c.high > candles[i - 1].high &&
      c.high > candles[i - 2].high &&
      c.high > candles[i + 1].high &&
      c.high > candles[i + 2].high;
    const isSwingLow =
      c.low < candles[i - 1].low &&
      c.low < candles[i - 2].low &&
      c.low < candles[i + 1].low &&
      c.low < candles[i + 2].low;
    if (isSwingHigh) highs.push(c.high);
    if (isSwingLow) lows.push(c.low);
  }

  const lastClose = candles[candles.length - 1].close;
  const tolerance = Math.max(lastClose * 0.0015, 1e-8);

  const cluster = (levels: number[]): number[] => {
    const sorted = [...levels].sort((a, b) => a - b);
    const out: number[] = [];
    for (const lvl of sorted) {
      const prev = out[out.length - 1];
      if (prev === undefined || Math.abs(lvl - prev) > tolerance) {
        out.push(lvl);
      } else {
        out[out.length - 1] = (prev + lvl) / 2;
      }
    }
    return out;
  };

  const resistance = cluster(highs.filter((h) => h > lastClose))
    .sort((a, b) => a - b)
    .slice(0, 3);
  const support = cluster(lows.filter((l) => l < lastClose))
    .sort((a, b) => b - a)
    .slice(0, 3);

  return { support, resistance };
}

export function calcFibonacci(candles: Candle[]): Record<string, number> {
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const high = Math.max(...highs.slice(-50));
  const low = Math.min(...lows.slice(-50));
  const diff = high - low;
  return {
    "0": high,
    "0.236": high - diff * 0.236,
    "0.382": high - diff * 0.382,
    "0.5": high - diff * 0.5,
    "0.618": high - diff * 0.618,
    "0.786": high - diff * 0.786,
    "1": low,
  };
}

/** Average Directional Index — trend strength (>25 strong, <20 ranging). */
export function calcADX(candles: Candle[], period = 14): number {
  if (candles.length < period + 2) return 0;
  const tr: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const p = candles[i - 1];
    tr.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)));
    const up = c.high - p.high;
    const down = p.low - c.low;
    plusDM.push(up > down && up > 0 ? up : 0);
    minusDM.push(down > up && down > 0 ? down : 0);
  }

  const smooth = (arr: number[]) => {
    const out: number[] = [];
    let sum = arr.slice(0, period).reduce((a, b) => a + b, 0);
    out.push(sum);
    for (let i = period; i < arr.length; i++) {
      sum = sum - sum / period + arr[i];
      out.push(sum);
    }
    return out;
  };

  const trS = smooth(tr);
  const plusS = smooth(plusDM);
  const minusS = smooth(minusDM);
  const dx: number[] = [];
  for (let i = 0; i < trS.length; i++) {
    const plusDI = (plusS[i] / trS[i]) * 100;
    const minusDI = (minusS[i] / trS[i]) * 100;
    const sum = plusDI + minusDI;
    dx.push(sum === 0 ? 0 : (Math.abs(plusDI - minusDI) / sum) * 100);
  }
  if (dx.length < period) return dx[dx.length - 1] ?? 0;
  return dx.slice(-period).reduce((a, b) => a + b, 0) / period;
}

/** Volume spike ratio: latest volume vs N-bar average (>1.5 = spike). */
export function calcVolumeSpike(candles: Candle[], period = 20): number {
  if (candles.length < period + 1) return 1;
  const recent = candles.slice(-period - 1, -1);
  const avg = recent.reduce((a, c) => a + c.volume, 0) / recent.length;
  const last = candles[candles.length - 1].volume;
  return avg > 0 ? last / avg : 1;
}

/** % position in the 20-bar high/low range (0=at low, 100=at high). */
export function calcRangePosition(candles: Candle[], period = 20): number {
  const slice = candles.slice(-period);
  const high = Math.max(...slice.map((c) => c.high));
  const low = Math.min(...slice.map((c) => c.low));
  const last = candles[candles.length - 1].close;
  if (high === low) return 50;
  return ((last - low) / (high - low)) * 100;
}

/** Returns "uptrend" | "downtrend" | "ranging" from a higher-timeframe candle set. */
export function higherTimeframeBias(candles: Candle[]): "uptrend" | "downtrend" | "ranging" {
  if (candles.length < 50) return "ranging";
  const closes = candles.map((c) => c.close);
  const ema20 = ema(closes, 20).pop() ?? 0;
  const ema50 = ema(closes, 50).pop() ?? 0;
  const last = closes[closes.length - 1];
  const adx = calcADX(candles);
  if (adx < 18) return "ranging";
  if (last > ema20 && ema20 > ema50) return "uptrend";
  if (last < ema20 && ema20 < ema50) return "downtrend";
  return "ranging";
}

export function detectCandlestickPattern(candles: Candle[]): string[] {
  const patterns: string[] = [];
  if (candles.length < 3) return patterns;
  // a = oldest of the last 3, b = previous, c = latest closed candle.
  const [, b, c] = candles.slice(-3);

  const bodyC = Math.abs(c.close - c.open);
  const rangeC = c.high - c.low;
  if (rangeC > 0 && bodyC < rangeC * 0.1) patterns.push("Doji");

  // Engulfing must compare the LATEST candle to the PREVIOUS one (was b vs a).
  if (
    c.close > c.open &&
    b.close < b.open &&
    c.close >= b.open &&
    c.open <= b.close
  ) {
    patterns.push("Bullish Engulfing");
  }
  if (
    c.close < c.open &&
    b.close > b.open &&
    c.close <= b.open &&
    c.open >= b.close
  ) {
    patterns.push("Bearish Engulfing");
  }

  if (c.close > c.open && c.close > b.high) patterns.push("Bullish Continuation");
  if (c.close < c.open && c.close < b.low) patterns.push("Bearish Continuation");

  return patterns;
}

export function computeIndicators(candles: Candle[]): IndicatorSnapshot {
  const closes = candles.map((c) => c.close);
  const ema9Arr = ema(closes, 9);
  const ema21Arr = ema(closes, 21);
  const ema50Arr = ema(closes, 50);
  const rsi = calcRSI(closes);
  const macd = calcMACD(closes);
  const bb = calcBollinger(closes);
  const atr = calcATR(candles);
  const vwap = calcVWAP(candles.slice(-50));
  const stochRsi = calcStochRSI(closes);
  const adx = calcADX(candles);
  const volumeSpike = calcVolumeSpike(candles);
  const rangePosition = calcRangePosition(candles);

  const ema9 = ema9Arr[ema9Arr.length - 1];
  const ema21 = ema21Arr[ema21Arr.length - 1];
  const ema50 = ema50Arr[ema50Arr.length - 1];
  const price = closes[closes.length - 1];

  let trend: IndicatorSnapshot["trend"] = "neutral";
  let trendStrength = 0;
  if (ema9 > ema21 && ema21 > ema50 && price > ema9) {
    trend = "bullish";
    trendStrength = Math.min(100, ((ema9 - ema50) / ema50) * 1000);
  } else if (ema9 < ema21 && ema21 < ema50 && price < ema9) {
    trend = "bearish";
    trendStrength = Math.min(100, ((ema50 - ema9) / ema50) * 1000);
  }

  return {
    rsi,
    macd,
    ema9,
    ema21,
    ema50,
    sma20: sma(closes, 20),
    sma50: sma(closes, 50),
    bb,
    atr,
    vwap,
    stochRsi,
    adx,
    volumeSpike,
    rangePosition,
    trend,
    trendStrength,
  };
}
