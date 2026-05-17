import type { OptionChainSnapshot } from "@/types/india";
import type { OiInsight } from "@/types/india-advanced";

/** Heuristic OI positioning from chain snapshot (educational model). */
export function analyzeOiPositioning(
  chain: OptionChainSnapshot,
  prevPcr?: number
): OiInsight {
  const { strikes, spotPrice, pcr } = chain;
  const atm = strikes.reduce((best, r) =>
    Math.abs(r.strike - spotPrice) < Math.abs(best.strike - spotPrice) ? r : best
  );

  const callOiNear = atm.callOi;
  const putOiNear = atm.putOi;
  const totalNear = callOiNear + putOiNear + 1;

  let type: OiInsight["type"] = "neutral";
  let label = "Mixed OI — no clear buildup";
  let confidence = 40;

  if (pcr > 1.15 && putOiNear > callOiNear * 1.2) {
    type = "long_buildup";
    label = "Put OI buildup near ATM — hedging / bullish positioning";
    confidence = 62;
  } else if (pcr < 0.85 && callOiNear > putOiNear * 1.2) {
    type = "short_buildup";
    label = "Call OI buildup — bearish / short hedge bias";
    confidence = 60;
  }

  if (prevPcr !== undefined) {
    if (pcr > prevPcr + 0.08 && pcr > 1) {
      type = "short_covering";
      label = "PCR rising — possible short covering in index";
      confidence = 58;
    }
    if (pcr < prevPcr - 0.08 && pcr < 1) {
      type = "long_unwinding";
      label = "PCR falling — long unwinding / risk-off";
      confidence = 56;
    }
  }

  const oiSkew = putOiNear / totalNear;
  if (oiSkew > 0.58 && type === "neutral") {
    type = "long_buildup";
    label = "Put-heavy near ATM — support zone building";
    confidence = 55;
  }

  return { type, label, confidence };
}
