import type { Candle } from "@/types";

export interface CandleQuality {
  label: string;
  score: number;
  bodyRatio: number;
}

function body(c: Candle) {
  return Math.abs(c.close - c.open);
}

function isBull(c: Candle) {
  return c.close > c.open;
}

export function detectIntradayPatterns(candles: Candle[]): { patterns: string[]; strength: number } {
  const patterns: string[] = [];
  if (candles.length < 3) return { patterns, strength: 0 };
  const [, b, c] = candles.slice(-3);
  const rangeC = c.high - c.low;
  const bodyC = body(c);

  if (rangeC > 0 && bodyC < rangeC * 0.1) patterns.push("Doji");
  if (rangeC > 0 && bodyC < rangeC * 0.25) {
    const lowerWick = Math.min(c.open, c.close) - c.low;
    const upperWick = c.high - Math.max(c.open, c.close);
    if (lowerWick > bodyC * 2) patterns.push("Hammer");
    if (upperWick > bodyC * 2) patterns.push("Shooting Star");
  }

  if (isBull(c) && !isBull(b) && c.close >= b.open && c.open <= b.close) {
    patterns.push("Bullish Engulfing");
  }
  if (!isBull(c) && isBull(b) && c.close <= b.open && c.open >= b.close) {
    patterns.push("Bearish Engulfing");
  }

  if (candles.length >= 3) {
    const trio = candles.slice(-3);
    if (trio.every(isBull)) patterns.push("Three White Soldiers");
    if (trio.every((x) => !isBull(x))) patterns.push("Three Black Crows");
  }

  const strength = Math.min(
    100,
    patterns.length * 18 +
      (patterns.includes("Bullish Engulfing") || patterns.includes("Bearish Engulfing") ? 25 : 0)
  );
  return { patterns, strength };
}

export function analyzeCandleQuality(candles: Candle[]): CandleQuality {
  const c = candles[candles.length - 1];
  const range = c.high - c.low || 1;
  const b = body(c);
  const bodyRatio = b / range;
  const upperWick = c.high - Math.max(c.open, c.close);
  const lowerWick = Math.min(c.open, c.close) - c.low;
  const upperRatio = upperWick / range;
  const lowerRatio = lowerWick / range;

  if (isBull(c) && bodyRatio > 0.65 && lowerRatio < 0.15) {
    return { label: "Strong Bullish Candle", score: 85, bodyRatio };
  }
  if (!isBull(c) && bodyRatio > 0.65 && upperRatio < 0.15) {
    return { label: "Strong Bearish Candle", score: 85, bodyRatio };
  }
  if (bodyRatio < 0.2 && (upperRatio > 0.4 || lowerRatio > 0.4)) {
    return { label: "Exhaustion Candle", score: 35, bodyRatio };
  }
  if (bodyRatio < 0.25) {
    return { label: "Indecision Candle", score: 40, bodyRatio };
  }
  return {
    label: isBull(c) ? "Bullish Candle" : "Bearish Candle",
    score: 55 + bodyRatio * 30,
    bodyRatio,
  };
}
