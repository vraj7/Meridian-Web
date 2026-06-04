import { findSupportResistance } from "@/engines/indicators";
import type { Candle } from "@/types";
import type { LevelZone, VolumeProfileLevels } from "@/types/futures-intraday";

export function buildVolumeProfile(candles: Candle[], bins = 24): VolumeProfileLevels {
  const slice = candles.slice(-80);
  if (!slice.length) {
    const p = candles[candles.length - 1]?.close ?? 0;
    return { poc: p, vah: p, val: p, nodes: [] };
  }
  const low = Math.min(...slice.map((c) => c.low));
  const high = Math.max(...slice.map((c) => c.high));
  const step = (high - low) / bins || 1;
  const hist = new Array(bins).fill(0) as number[];

  for (const c of slice) {
    const typical = (c.high + c.low + c.close) / 3;
    const idx = Math.min(bins - 1, Math.max(0, Math.floor((typical - low) / step)));
    hist[idx] += c.volume;
  }

  let maxIdx = 0;
  for (let i = 1; i < bins; i++) {
    if (hist[i] > hist[maxIdx]) maxIdx = i;
  }
  const poc = low + (maxIdx + 0.5) * step;
  const total = hist.reduce((a, b) => a + b, 0) || 1;
  let cum = 0;
  let valIdx = 0;
  let vahIdx = bins - 1;
  for (let i = 0; i < bins; i++) {
    cum += hist[i];
    if (cum / total >= 0.15 && valIdx === 0) valIdx = i;
    if (cum / total >= 0.85) {
      vahIdx = i;
      break;
    }
  }
  const nodes = hist
    .map((v, i) => ({ v, price: low + (i + 0.5) * step }))
    .filter((x) => x.v > total * 0.08)
    .sort((a, b) => b.v - a.v)
    .slice(0, 5)
    .map((x) => x.price);

  return {
    poc,
    vah: low + (vahIdx + 0.5) * step,
    val: low + (valIdx + 0.5) * step,
    nodes,
  };
}

function zoneFromSwings(candles: Candle[], bullish: boolean): LevelZone[] {
  const zones: LevelZone[] = [];
  const slice = candles.slice(-40);
  for (let i = 2; i < slice.length - 2; i++) {
    const c = slice[i];
    const body = Math.abs(c.close - c.open);
    const range = c.high - c.low;
    if (range <= 0 || body / range < 0.35) continue;
    if (bullish && c.close > c.open) {
      zones.push({
        price: (c.low + c.open) / 2,
        strength: 55 + body / range * 30,
        kind: "demand",
      });
    }
    if (!bullish && c.close < c.open) {
      zones.push({
        price: (c.high + c.open) / 2,
        strength: 55 + body / range * 30,
        kind: "supply",
      });
    }
  }
  return zones.slice(-3);
}

export interface LevelMapResult {
  supports: LevelZone[];
  resistances: LevelZone[];
  profile: VolumeProfileLevels;
  nearestResistanceBlocksLong: boolean;
  nearestSupportBlocksShort: boolean;
}

export function buildLevelMap(candles: Candle[]): LevelMapResult {
  const { support, resistance } = findSupportResistance(candles);
  const profile = buildVolumeProfile(candles);
  const price = candles[candles.length - 1].close;
  const atr =
    candles.length > 15
      ? candles.slice(-15).reduce((s, c) => s + (c.high - c.low), 0) / 15
      : price * 0.01;

  const supports: LevelZone[] = [
    ...support.map((price) => ({ price, strength: 70, kind: "support" as const })),
    { price: profile.val, strength: 62, kind: "val" as const },
    { price: profile.poc, strength: 58, kind: "poc" as const },
    ...zoneFromSwings(candles, true),
  ].filter((z) => z.price < price);

  const resistances: LevelZone[] = [
    ...resistance.map((price) => ({ price, strength: 70, kind: "resistance" as const })),
    { price: profile.vah, strength: 62, kind: "vah" as const },
    { price: profile.poc, strength: 58, kind: "poc" as const },
    ...zoneFromSwings(candles, false),
  ].filter((z) => z.price > price);

  const nearBlock = (levels: LevelZone[]): boolean => {
    const nearest = levels.sort((a, b) => Math.abs(a.price - price) - Math.abs(b.price - price))[0];
    if (!nearest) return false;
    return Math.abs(nearest.price - price) < atr * 0.35 && nearest.strength >= 65;
  };

  return {
    supports: supports.sort((a, b) => b.price - a.price),
    resistances: resistances.sort((a, b) => a.price - b.price),
    profile,
    nearestResistanceBlocksLong: nearBlock(resistances),
    nearestSupportBlocksShort: nearBlock(supports),
  };
}
