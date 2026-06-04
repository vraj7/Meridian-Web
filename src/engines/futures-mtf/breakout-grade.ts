import type { ExtendedIndicatorSet } from "@/types/futures-intraday";
import type { LevelMapResult } from "./levels-engine";
import type { FuturesSetupGrade } from "@/types/futures-intraday";

export function gradeBreakout(params: {
  direction: "LONG" | "SHORT";
  ind15: ExtendedIndicatorSet;
  ind5: ExtendedIndicatorSet;
  levels: LevelMapResult;
  volumeOk: boolean;
  structureScore: number;
}): FuturesSetupGrade {
  const { direction, ind15, ind5, levels, volumeOk, structureScore } = params;
  let score = 50;
  if (ind15.adx >= 25) score += 15;
  else if (ind15.adx >= 20) score += 8;
  if (volumeOk && ind5.relativeVolume >= 1.25) score += 18;
  if (structureScore >= 70) score += 12;
  const blocked =
    direction === "LONG"
      ? levels.nearestResistanceBlocksLong
      : levels.nearestSupportBlocksShort;
  if (blocked) score -= 25;

  if (score >= 88 && volumeOk && ind15.adx >= 22 && !blocked) return "A+";
  if (score >= 78 && volumeOk && ind15.adx >= 20) return "A";
  if (score >= 62) return "B";
  return "C";
}
