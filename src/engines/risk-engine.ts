import { resolveCryptoSignalFilters } from "@/config/crypto-signal-filters";
import type { Timeframe, TradingSignal } from "@/types";

export interface RiskAssessment {
  safe: boolean;
  warnings: string[];
  positionSizePercent: number;
  maxLeverage: number;
}

/** Minimum R:R required for a setup, by holding timeframe. */
export function minRiskReward(tf: Timeframe): number {
  if (tf === "1m" || tf === "5m") return 1.5; // scalp
  if (tf === "4h" || tf === "1D" || tf === "1W") return 1.8; // swing
  return 1.6; // intraday — between scalp & swing
}

export function assessTradeRisk(
  signal: TradingSignal,
  accountRiskPercent = 1
): RiskAssessment {
  const warnings: string[] = [...signal.warnings];
  const rrFloor = minRiskReward(signal.bestTimeframe);

  if (signal.confidence < 70) warnings.push("Below optimal confidence threshold");
  if (signal.riskScore > 60) warnings.push("Elevated volatility — reduce position size");
  if (signal.riskReward < rrFloor) {
    warnings.push(
      `Risk/reward ${signal.riskReward.toFixed(2)}x below ${rrFloor}x minimum for ${signal.bestTimeframe} — poor setup`
    );
  }

  const isFutures = signal.market === "futures";
  let maxLeverage = 1;
  if (isFutures) {
    if (signal.riskScore > 60) maxLeverage = 3;
    else if (signal.riskScore > 40) maxLeverage = 7;
    else maxLeverage = 10;
    if (signal.confidence < 75) maxLeverage = Math.min(maxLeverage, 3);
    if (signal.tradeQuality === "A+") maxLeverage = Math.min(maxLeverage * 1.5, 15);
    if (signal.tradeQuality === "D") maxLeverage = 0;
  }

  let positionSizePercent = accountRiskPercent;
  if (signal.riskScore > 50) positionSizePercent *= 0.5;
  if (signal.confidence >= 85) positionSizePercent *= 1.2;
  if (signal.tradeQuality === "A+") positionSizePercent *= 1.2;
  if (signal.tradeQuality === "C") positionSizePercent *= 0.5;
  if (signal.tradeQuality === "D" || signal.capitalPreservationMode) positionSizePercent = 0;
  positionSizePercent = Math.min(2, Math.max(0, positionSizePercent));

  const safe =
    signal.confidence >= 65 &&
    signal.riskReward >= rrFloor &&
    signal.confirmations.length >= 2 &&
    signal.tradeQuality !== "D" &&
    !signal.capitalPreservationMode &&
    !warnings.some((w) => w.includes("Mixed signals"));

  return {
    safe,
    warnings,
    positionSizePercent: Math.round(positionSizePercent * 100) / 100,
    maxLeverage: Math.round(maxLeverage),
  };
}

export function filterSignals(
  signals: TradingSignal[],
  minConfidence: number,
  options?: { relaxed?: boolean }
): TradingSignal[] {
  const filters = resolveCryptoSignalFilters(minConfidence, options?.relaxed ?? false);
  const minConfirmations = filters.relaxed ? 1 : 2;

  return signals.filter((s) => {
    const isCrypto = s.market === "spot" || s.market === "futures";
    const rrFloor = isCrypto
      ? filters.minRiskReward
      : filters.relaxed
        ? filters.minRiskReward
        : minRiskReward(s.bestTimeframe);
    const qualityOk = s.tradeQuality !== "D";
    const preservationOk = filters.relaxed || !s.capitalPreservationMode;
    return (
      s.confidence >= filters.minConfidence &&
      s.confirmations.length >= minConfirmations &&
      s.action !== "WAIT" &&
      s.action !== "HOLD" &&
      s.riskReward >= rrFloor &&
      qualityOk &&
      preservationOk
    );
  });
}

export function calculatePositionSize(params: {
  accountBalance: number;
  riskPercent: number;
  entryPrice: number;
  stopLoss: number;
}): { size: number; riskAmount: number } {
  const { accountBalance, riskPercent, entryPrice, stopLoss } = params;
  const riskAmount = accountBalance * (riskPercent / 100);
  const stopDistance = Math.abs(entryPrice - stopLoss) / entryPrice;
  if (stopDistance === 0) return { size: 0, riskAmount: 0 };
  const size = riskAmount / stopDistance;
  return { size: Math.round(size * 100) / 100, riskAmount };
}
