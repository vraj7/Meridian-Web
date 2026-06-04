import type { FuturesMetrics, MarketTrendLabel } from "@/types";
import type { ExtendedIndicatorSet } from "@/types/futures-intraday";

export function analyzeFunding(futures?: FuturesMetrics): {
  note: string;
  penalty: number;
  crowded: "long" | "short" | "none";
} {
  if (!futures) return { note: "Funding data unavailable", penalty: 0, crowded: "none" };
  const fr = futures.fundingRate;
  if (fr > 0.01) {
    return {
      note: "Overcrowded longs — elevated positive funding",
      penalty: 12,
      crowded: "long",
    };
  }
  if (fr < -0.01) {
    return {
      note: "Overcrowded shorts — elevated negative funding",
      penalty: 12,
      crowded: "short",
    };
  }
  return { note: "Funding neutral", penalty: 0, crowded: "none" };
}

export function analyzeOi(
  futures: FuturesMetrics | undefined,
  direction: "LONG" | "SHORT",
  priceChangePct: number
): { note: string; bonus: number } {
  if (!futures?.openInterest) {
    return { note: "OI data limited", bonus: 0 };
  }
  const rising = priceChangePct > 0.15;
  const falling = priceChangePct < -0.15;
  if (direction === "LONG" && rising) {
    return { note: "Price up — OI supportive (long buildup heuristic)", bonus: 8 };
  }
  if (direction === "SHORT" && falling) {
    return { note: "Price down — OI supportive (short buildup heuristic)", bonus: 8 };
  }
  if (direction === "LONG" && falling) {
    return { note: "Price down with active perp — caution on longs", bonus: -6 };
  }
  return { note: "Mixed OI / price relationship", bonus: 0 };
}

export function btcContextNote(
  symbol: string,
  direction: "LONG" | "SHORT",
  btcTrend: MarketTrendLabel,
  correlation: number
): { note: string; penalty: number } {
  if (symbol === "BTC") return { note: "BTC anchor asset", penalty: 0 };
  const fighting =
    (direction === "LONG" && btcTrend === "Downtrend") ||
    (direction === "SHORT" && btcTrend === "Uptrend");
  if (fighting && correlation > 0.55) {
    return {
      note: `Altcoin ${direction} fights BTC ${btcTrend} (ρ≈${correlation.toFixed(2)})`,
      penalty: 14,
    };
  }
  return { note: `BTC ${btcTrend} — context aligned`, penalty: 0 };
}

export function pearsonCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 10) return 0.5;
  const xs = a.slice(-n);
  const ys = b.slice(-n);
  const mx = xs.reduce((s, v) => s + v, 0) / n;
  const my = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i++) {
    const vx = xs[i] - mx;
    const vy = ys[i] - my;
    num += vx * vy;
    dx += vx * vx;
    dy += vy * vy;
  }
  const den = Math.sqrt(dx * dy);
  return den ? Math.abs(num / den) : 0.5;
}

export function volumeConfirmation(
  ind15: ExtendedIndicatorSet,
  ind5: ExtendedIndicatorSet,
  direction: "LONG" | "SHORT"
): { ok: boolean; note: string; score: number } {
  const up = ind15.obvSlope > 0 && ind5.relativeVolume >= 1.1;
  const down = ind15.obvSlope < 0 && ind5.relativeVolume >= 1.1;
  if (direction === "LONG" && up) {
    return { ok: true, note: "Price/volume rising on 5m+15m", score: 18 };
  }
  if (direction === "SHORT" && down) {
    return { ok: true, note: "Price/volume falling on 5m+15m", score: 18 };
  }
  if (ind5.relativeVolume < 0.85) {
    return { ok: false, note: "Weak volume — move lacks participation", score: -15 };
  }
  return { ok: ind5.relativeVolume >= 1, note: "Volume mixed", score: 5 };
}
