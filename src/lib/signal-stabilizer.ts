import type { SignalAction, TradingSignal } from "@/types";

/** How long the same directional call is held unless conviction jumps. */
export const DEFAULT_SIGNAL_LOCK_MS = 15 * 60 * 1000;

/** Confidence gap required to flip long ↔ short during lock window. */
export const DIRECTION_FLIP_MARGIN = 12;

/** Keep same action label if confidence moves less than this. */
export const ACTION_STABILITY_MARGIN = 8;

export function signalDirection(action: SignalAction): "bull" | "bear" | "neutral" {
  if (action.includes("BUY") || action.includes("LONG")) return "bull";
  if (action.includes("SELL") || action.includes("SHORT")) return "bear";
  return "neutral";
}

export function signalStableKey(signal: Pick<TradingSignal, "market" | "symbol" | "bestTimeframe">): string {
  return `${signal.market}:${signal.symbol}:${signal.bestTimeframe}`;
}

function minutesSince(ms: number, now: number): number {
  return Math.max(0, Math.round((now - ms) / 60_000));
}

/**
 * Prevents flip-flopping on every poll: holds direction for ~15m unless
 * the new read is materially stronger or price invalidates levels.
 */
export function stabilizeSignal(
  previous: TradingSignal | undefined,
  incoming: TradingSignal,
  lockMs = DEFAULT_SIGNAL_LOCK_MS
): TradingSignal {
  const now = incoming.timestamp;
  if (!previous) {
    return { ...incoming, signalSince: now };
  }

  const since = previous.signalSince ?? previous.timestamp;
  const elapsed = now - since;
  const withinLock = elapsed < lockMs;

  const prevDir = signalDirection(previous.action);
  const nextDir = signalDirection(incoming.action);

  const priceDrift =
    previous.currentPrice && incoming.currentPrice
      ? Math.abs(incoming.currentPrice - previous.currentPrice) / previous.currentPrice
      : 0;

  const levelsStale = priceDrift > 0.012;

  const liveTrendFields = {
    chartTrend: incoming.chartTrend,
    higherTfTrend: incoming.higherTfTrend,
    overallTrend: incoming.overallTrend,
    trendDetail: incoming.trendDetail,
    trendSummary: incoming.trendSummary,
  };

  if (!withinLock) {
    const sameDirection = prevDir === nextDir && prevDir !== "neutral";
    return {
      ...incoming,
      signalSince: sameDirection ? since : now,
    };
  }

  // Opposite direction during lock — require stronger new conviction
  if (
    prevDir !== "neutral" &&
    nextDir !== "neutral" &&
    prevDir !== nextDir &&
    incoming.confidence < previous.confidence + DIRECTION_FLIP_MARGIN
  ) {
    return {
      ...previous,
      ...liveTrendFields,
      currentPrice: incoming.currentPrice,
      timestamp: now,
      signalSince: since,
      refreshNote: `Bias held ${minutesSince(since, now)}m — reversal not confirmed yet`,
    };
  }

  // Same direction — keep label/levels if confidence is similar
  if (
    prevDir === nextDir &&
    prevDir !== "neutral" &&
    Math.abs(incoming.confidence - previous.confidence) < ACTION_STABILITY_MARGIN &&
    !levelsStale
  ) {
    return {
      ...previous,
      ...liveTrendFields,
      currentPrice: incoming.currentPrice,
      confidence: incoming.confidence,
      bullishScore: incoming.bullishScore,
      bearishScore: incoming.bearishScore,
      timestamp: now,
      signalSince: since,
      refreshNote: `Stable ${minutesSince(since, now)}m — plan unchanged`,
    };
  }

  // Material change while locked — allow update but keep signalSince if direction unchanged
  return {
    ...incoming,
    signalSince: prevDir === nextDir ? since : now,
    refreshNote:
      prevDir === nextDir
        ? `Updated levels (${minutesSince(since, now)}m in trade)`
        : undefined,
  };
}

export function stabilizeSignalBatch(
  previousByKey: Record<string, TradingSignal>,
  incoming: TradingSignal[],
  lockMs = DEFAULT_SIGNAL_LOCK_MS
): { signals: TradingSignal[]; nextByKey: Record<string, TradingSignal> } {
  const nextByKey = { ...previousByKey };
  const signals = incoming.map((s) => {
    const key = signalStableKey(s);
    const stabilized = stabilizeSignal(previousByKey[key], s, lockMs);
    nextByKey[key] = stabilized;
    return stabilized;
  });
  return { signals, nextByKey };
}
