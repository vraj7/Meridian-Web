import type { LevelMapResult } from "./levels-engine";
import type { LiquiditySnapshot } from "@/types/futures-intraday";
import type { ExtendedIndicatorSet } from "@/types/futures-intraday";

export interface StopTpPlan {
  entry: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  tp3: number;
  tp4?: number;
  riskPercent: number;
  rewardPercent: number;
  riskReward: number;
  stopLossQuality: number;
  holdingMinutes: 15 | 30 | 45 | 60;
}

export function buildStopAndTargets(params: {
  direction: "LONG" | "SHORT";
  price: number;
  ind15: ExtendedIndicatorSet;
  levels: LevelMapResult;
  liquidity: LiquiditySnapshot;
}): StopTpPlan | null {
  const { direction, price, ind15, levels, liquidity } = params;
  const atrStop = ind15.atr * 1.5;
  const support = levels.supports[0]?.price;
  const resistance = levels.resistances[0]?.price;
  const demand = levels.supports.find((z) => z.kind === "demand")?.price;
  const supply = levels.resistances.find((z) => z.kind === "supply")?.price;

  let stop: number;
  if (direction === "LONG") {
    const candidates = [
      support ? support * 0.998 : price - atrStop,
      demand ? demand * 0.997 : price - atrStop,
      price - atrStop,
    ];
    stop = Math.min(...candidates.filter((x) => x < price && x > 0));
  } else {
    const candidates = [
      resistance ? resistance * 1.002 : price + atrStop,
      supply ? supply * 1.003 : price + atrStop,
      price + atrStop,
    ];
    stop = Math.max(...candidates.filter((x) => x > price));
  }

  const risk = Math.abs(price - stop);
  if (risk <= 0 || risk / price > 0.02) return null;

  const sign = direction === "LONG" ? 1 : -1;
  const tp1 = price + sign * risk;
  const tp2 = price + sign * risk * 2;
  const tp3 = price + sign * risk * 3;
  const major =
    direction === "LONG"
      ? levels.resistances[levels.resistances.length - 1]?.price
      : levels.supports[levels.supports.length - 1]?.price;
  const tp4 = major && Math.abs(major - price) > risk * 2.5 ? major : undefined;

  const reward = Math.abs(tp2 - price);
  const riskReward = reward / risk;
  if (riskReward < 2) return null;

  let stopLossQuality = 70;
  if (liquidity.stopHuntRisk > 60) stopLossQuality -= 18;
  if (risk / price > 0.012) stopLossQuality -= 10;
  if (risk / price < 0.004) stopLossQuality += 8;
  stopLossQuality = Math.max(0, Math.min(100, stopLossQuality));
  if (stopLossQuality < 45) return null;

  const volBoost = ind15.relativeVolume > 1.4 ? 15 : ind15.relativeVolume > 1.1 ? 30 : 45;
  const holdingMinutes: 15 | 30 | 45 | 60 =
    volBoost <= 20 ? 15 : volBoost <= 35 ? 30 : volBoost <= 42 ? 45 : 60;

  return {
    entry: price,
    stopLoss: stop,
    tp1,
    tp2,
    tp3,
    tp4,
    riskPercent: (risk / price) * 100,
    rewardPercent: (reward / price) * 100,
    riskReward,
    stopLossQuality,
    holdingMinutes,
  };
}
