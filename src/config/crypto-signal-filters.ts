/** Thresholds for crypto spot/futures batch signals (strict vs relaxed). */
export interface CryptoSignalFilters {
  minConfidence: number;
  minConfirmations: number;
  minRiskReward: number;
  relaxed: boolean;
}

export function resolveCryptoSignalFilters(
  baseMinConfidence: number,
  relaxed: boolean
): CryptoSignalFilters {
  if (!relaxed) {
    return {
      minConfidence: baseMinConfidence,
      minConfirmations: 3,
      minRiskReward: 1.4,
      relaxed: false,
    };
  }
  return {
    minConfidence: Math.max(40, baseMinConfidence - 20),
    minConfirmations: 2,
    minRiskReward: 1.1,
    relaxed: true,
  };
}

export function isCryptoTradeEligible(
  signal: {
    confidence: number;
    confirmations: string[];
    riskReward: number;
    action: string;
  },
  filters: CryptoSignalFilters
): boolean {
  return (
    signal.confidence >= filters.minConfidence &&
    signal.confirmations.length >= filters.minConfirmations &&
    signal.riskReward >= filters.minRiskReward &&
    signal.action !== "WAIT" &&
    signal.action !== "HOLD"
  );
}
