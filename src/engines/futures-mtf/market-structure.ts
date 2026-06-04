import type { Candle } from "@/types";
import type { MarketStructureSnapshot } from "@/types/futures-intraday";

function swingPivots(candles: Candle[]): { highs: number[]; lows: number[] } {
  const highs: number[] = [];
  const lows: number[] = [];
  for (let i = 2; i < candles.length - 2; i++) {
    const c = candles[i];
    if (
      c.high > candles[i - 1].high &&
      c.high > candles[i - 2].high &&
      c.high > candles[i + 1].high &&
      c.high > candles[i + 2].high
    ) {
      highs.push(c.high);
    }
    if (
      c.low < candles[i - 1].low &&
      c.low < candles[i - 2].low &&
      c.low < candles[i + 1].low &&
      c.low < candles[i + 2].low
    ) {
      lows.push(c.low);
    }
  }
  return { highs, lows };
}

export function analyzeMarketStructure(candles: Candle[]): MarketStructureSnapshot {
  const events: string[] = [];
  const { highs, lows } = swingPivots(candles);
  const h1 = highs[highs.length - 1];
  const h2 = highs[highs.length - 2];
  const l1 = lows[lows.length - 1];
  const l2 = lows[lows.length - 2];
  const price = candles[candles.length - 1].close;

  const higherHigh = h1 !== undefined && h2 !== undefined && h1 > h2;
  const higherLow = l1 !== undefined && l2 !== undefined && l1 > l2;
  const lowerHigh = h1 !== undefined && h2 !== undefined && h1 < h2;
  const lowerLow = l1 !== undefined && l2 !== undefined && l1 < l2;

  let bias: MarketStructureSnapshot["bias"] = "neutral";
  let score = 50;

  if (higherHigh && higherLow) {
    bias = "bullish";
    score = 72;
    events.push("HH + HL — bullish structure");
  } else if (lowerHigh && lowerLow) {
    bias = "bearish";
    score = 72;
    events.push("LH + LL — bearish structure");
  }

  const bos =
    (bias === "bullish" && h1 !== undefined && price > h1) ||
    (bias === "bearish" && l1 !== undefined && price < l1);
  const choch =
    (bias === "bullish" && lowerLow) || (bias === "bearish" && higherHigh);

  if (bos) {
    events.push("Break of structure");
    score += 8;
  }
  if (choch) {
    events.push("Change of character");
    score -= 6;
  }

  const continuation = bias === "bullish" && higherHigh && !choch;
  const reversal = choch;

  return {
    bias,
    score: Math.min(100, Math.max(0, score)),
    higherHigh,
    higherLow,
    lowerHigh,
    lowerLow,
    bos,
    choch,
    continuation,
    reversal,
    events,
  };
}
