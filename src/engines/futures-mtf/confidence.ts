import type { FuturesSetupGrade } from "@/types/futures-intraday";

function gradeScore(grade: FuturesSetupGrade): number {
  if (grade === "A+") return 92;
  if (grade === "A") return 78;
  if (grade === "B") return 62;
  return 38;
}

/** Map volume confirmation score (-15…18) to 0–100. */
function normalizeVolumeScore(volScore: number, volOk: boolean): number {
  const base = 52 + volScore * 2.2;
  return Math.min(100, Math.max(0, volOk ? base + 8 : base));
}

export interface IntradayConfidenceInput {
  direction: "LONG" | "SHORT";
  longMtf: number;
  shortMtf: number;
  structureScore: number;
  volOk: boolean;
  volScore: number;
  divergenceScore: number;
  patternStrength: number;
  candleScore: number;
  oiBonus: number;
  fundingPenalty: number;
  btcPenalty: number;
  adx: number;
  breakoutGrade: FuturesSetupGrade;
  stopQuality?: number;
  hasValidPlan: boolean;
  /** When false, apply penalties so universe rows reflect incomplete setups. */
  entryRulesOk: boolean;
  entryFailCount: number;
}

/**
 * Weighted 0–100 confidence (not additive from a 72 baseline).
 * Universe table uses entry penalties; live signals pass with entryRulesOk true.
 */
export function computeIntradayConfidence(input: IntradayConfidenceInput): number {
  const mtfAlign = (input.direction === "LONG" ? input.longMtf : input.shortMtf) * 100;
  const volNorm = normalizeVolumeScore(input.volScore, input.volOk);
  const divNorm = Math.min(100, input.divergenceScore * 1.15);
  const patternNorm = Math.min(100, input.patternStrength);
  const candleNorm = Math.min(100, input.candleScore);
  const adxNorm = Math.min(100, Math.max(0, (input.adx - 12) * 2.8));
  const contextNorm = Math.min(
    100,
    Math.max(0, 58 + input.oiBonus * 2 - input.fundingPenalty - input.btcPenalty)
  );
  const execNorm = input.hasValidPlan && input.stopQuality !== undefined
    ? input.stopQuality * 0.55 + gradeScore(input.breakoutGrade) * 0.45
    : gradeScore(input.breakoutGrade) * 0.65;

  let score =
    mtfAlign * 0.24 +
    input.structureScore * 0.14 +
    volNorm * 0.14 +
    patternNorm * 0.05 +
    candleNorm * 0.05 +
    adxNorm * 0.1 +
    divNorm * 0.08 +
    contextNorm * 0.1 +
    execNorm * 0.1;

  if (!input.entryRulesOk) {
    score -= Math.min(28, input.entryFailCount * 7);
  }
  if (!input.hasValidPlan) score -= 14;
  if (input.breakoutGrade === "C") score -= 18;
  if (!input.volOk) score -= 10;
  if (input.fundingPenalty >= 10) score -= 8;

  return Math.round(Math.min(99, Math.max(0, score)));
}

const GRADE_ORDER: FuturesSetupGrade[] = ["C", "B", "A", "A+"];

function gradeFromConfidence(confidence: number): FuturesSetupGrade {
  if (confidence >= 88) return "A+";
  if (confidence >= 78) return "A";
  if (confidence >= 62) return "B";
  return "C";
}

/**
 * Letter grade shown in UI — the lower of breakout quality and overall confidence
 * so you never see "A" with 45% confidence.
 */
export function resolveDisplayGrade(
  breakoutGrade: FuturesSetupGrade,
  confidence: number
): FuturesSetupGrade {
  const fromConf = gradeFromConfidence(confidence);
  const bIdx = GRADE_ORDER.indexOf(breakoutGrade);
  const cIdx = GRADE_ORDER.indexOf(fromConf);
  return GRADE_ORDER[Math.min(bIdx, cIdx)];
}
