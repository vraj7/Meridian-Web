import type { Candle } from "@/types";
import type { LiquiditySnapshot } from "@/types/futures-intraday";

function equalLevels(levels: number[], tolerancePct = 0.0015): number[] {
  const out: number[] = [];
  const sorted = [...levels].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    const cluster = sorted.filter(
      (x) => Math.abs(x - sorted[i]) / sorted[i] <= tolerancePct
    );
    if (cluster.length >= 2) out.push(cluster.reduce((a, b) => a + b, 0) / cluster.length);
  }
  return [...new Set(out.map((x) => Math.round(x * 100) / 100))].slice(0, 4);
}

export function analyzeLiquiditySMC(candles: Candle[]): LiquiditySnapshot {
  const slice = candles.slice(-60);
  const highs = slice.map((c) => c.high);
  const lows = slice.map((c) => c.low);
  const equalHighs = equalLevels(highs);
  const equalLows = equalLevels(lows);
  const price = slice[slice.length - 1]?.close ?? 0;

  const fvgs: LiquiditySnapshot["fvgs"] = [];
  const orderBlocks: LiquiditySnapshot["orderBlocks"] = [];

  for (let i = 2; i < slice.length; i++) {
    const a = slice[i - 2];
    const c = slice[i];
    if (a.high < c.low) {
      fvgs.push({ high: c.low, low: a.high, bullish: true });
    }
    if (a.low > c.high) {
      fvgs.push({ high: a.low, low: c.high, bullish: false });
    }
    if (c.close > c.open && c.close > slice[i - 1].high) {
      orderBlocks.push({ high: c.high, low: c.low, bullish: true });
    }
    if (c.close < c.open && c.close < slice[i - 1].low) {
      orderBlocks.push({ high: c.high, low: c.low, bullish: false });
    }
  }

  const nearEqualHigh = equalHighs.some((h) => Math.abs(h - price) / price < 0.004);
  const nearEqualLow = equalLows.some((l) => Math.abs(l - price) / price < 0.004);
  const stopHuntRisk = nearEqualHigh || nearEqualLow ? 72 : 28;
  const liquiditySweep =
    slice.length > 3 &&
    slice[slice.length - 1].high > Math.max(...slice.slice(-5, -1).map((c) => c.high)) &&
    slice[slice.length - 1].close < slice[slice.length - 2].close;

  return {
    equalHighs,
    equalLows,
    stopHuntRisk,
    fvgs: fvgs.slice(-4),
    orderBlocks: orderBlocks.slice(-3),
    liquiditySweep,
  };
}
