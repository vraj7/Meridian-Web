import type { Candle } from "@/types";

/** Decimal precision for lightweight-charts axis & price lines. */
export function getChartPriceFormat(referencePrice: number): {
  precision: number;
  minMove: number;
} {
  if (!Number.isFinite(referencePrice) || referencePrice <= 0) {
    return { precision: 2, minMove: 0.01 };
  }
  if (referencePrice >= 10_000) return { precision: 0, minMove: 1 };
  if (referencePrice >= 1_000) return { precision: 1, minMove: 0.1 };
  if (referencePrice >= 100) return { precision: 2, minMove: 0.01 };
  if (referencePrice >= 1) return { precision: 2, minMove: 0.01 };
  if (referencePrice >= 0.1) return { precision: 4, minMove: 0.0001 };
  if (referencePrice >= 0.01) return { precision: 5, minMove: 0.00001 };
  if (referencePrice >= 0.001) return { precision: 6, minMove: 0.000001 };
  if (referencePrice >= 0.0001) return { precision: 7, minMove: 0.0000001 };
  return { precision: 8, minMove: 0.00000001 };
}

/** Pick precision from candle range so SL/TP lines are not rounded to 0.24 / 0.25. */
export function getChartPriceFormatFromCandles(candles: Candle[]): {
  precision: number;
  minMove: number;
} {
  if (candles.length === 0) return getChartPriceFormat(1);

  const last = candles[candles.length - 1].close;
  let min = Infinity;
  let max = -Infinity;
  for (const c of candles) {
    if (c.low < min) min = c.low;
    if (c.high > max) max = c.high;
  }

  const rangeFmt = getChartPriceFormat(Math.max((max - min) / 50, min * 0.0001));
  const levelFmt = getChartPriceFormat(last);
  const precision = Math.max(rangeFmt.precision, levelFmt.precision);
  const minMove = Math.min(rangeFmt.minMove, levelFmt.minMove);

  return { precision, minMove };
}

/** Axis / overlay label (no currency symbol). */
export function formatChartPrice(price: number, precision?: number): string {
  const p = precision ?? getChartPriceFormat(Math.abs(price)).precision;
  return price.toFixed(p);
}
