import { calcMACD, calcRSI, calcStochRSI } from "@/engines/indicators";
import type { Candle } from "@/types";
import type { DivergenceSnapshot } from "@/types/futures-intraday";

function seriesDivergence(
  values: number[],
  prices: number[],
  lookback = 14
): "bullish" | "bearish" | "none" {
  if (values.length < lookback + 5) return "none";
  const v = values.slice(-lookback);
  const p = prices.slice(-lookback);
  const vMin = Math.min(...v);
  const vMax = Math.max(...v);
  const pMin = Math.min(...p);
  const pMax = Math.max(...p);
  const vLast = v[v.length - 1];
  const pLast = p[p.length - 1];
  if (pLast <= pMin * 1.002 && vLast > vMin + (vMax - vMin) * 0.15) return "bullish";
  if (pLast >= pMax * 0.998 && vLast < vMax - (vMax - vMin) * 0.15) return "bearish";
  return "none";
}

export function detectDivergences(candles: Candle[]): DivergenceSnapshot {
  const closes = candles.map((c) => c.close);
  const rsiSeries: number[] = [];
  for (let i = 20; i <= closes.length; i++) {
    rsiSeries.push(calcRSI(closes.slice(0, i)));
  }
  const macdSeries: number[] = [];
  for (let i = 30; i <= closes.length; i++) {
    macdSeries.push(calcMACD(closes.slice(0, i)).histogram);
  }
  const stochSeries: number[] = [];
  for (let i = 30; i <= closes.length; i++) {
    stochSeries.push(calcStochRSI(closes.slice(0, i)));
  }

  const rsi = seriesDivergence(rsiSeries, closes.slice(-rsiSeries.length));
  const macd = seriesDivergence(macdSeries, closes.slice(-macdSeries.length));
  const stochRsi = seriesDivergence(stochSeries, closes.slice(-stochSeries.length));

  let score = 0;
  const hits = [rsi, macd, stochRsi].filter((d) => d !== "none").length;
  score = hits * 22;

  return { rsi, macd, stochRsi, score };
}
