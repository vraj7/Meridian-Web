import type { SignalAction } from "@/types";

export type EntryTimingStatus = "in_zone" | "wait_for_price" | "extended" | "not_applicable";

const ZONE_TOLERANCE = 0.0025;

export function resolveEntryTiming(params: {
  isBullish: boolean;
  currentPrice: number;
  entryZone: [number, number];
  action: SignalAction;
}): {
  status: EntryTimingStatus;
  idealEntryPrice: number;
  waitForPrice?: number;
  entryTimingNote: string;
  suggestWaitForPrice: boolean;
  distanceToEntryPct: number;
} {
  const { isBullish, currentPrice, entryZone, action } = params;
  const [low, high] = entryZone;
  // LONG  → ideal toward the LOW of the zone (buy dip)
  // SHORT → ideal toward the HIGH of the zone (sell rally)
  const idealEntryPrice = isBullish
    ? low + (high - low) * 0.35
    : low + (high - low) * 0.65;

  if (action === "WAIT" || action === "HOLD") {
    return {
      status: "not_applicable",
      idealEntryPrice,
      entryTimingNote: "Signal is WAIT — no entry until conditions improve.",
      suggestWaitForPrice: true,
      distanceToEntryPct: 0,
    };
  }

  const lowerBound = low * (1 - ZONE_TOLERANCE);
  const upperBound = high * (1 + ZONE_TOLERANCE);
  const inZone = currentPrice >= lowerBound && currentPrice <= upperBound;

  const distanceToEntryPct =
    idealEntryPrice > 0
      ? Math.round(((currentPrice - idealEntryPrice) / idealEntryPrice) * 1000) / 10
      : 0;

  if (inZone) {
    return {
      status: "in_zone",
      idealEntryPrice,
      entryTimingNote:
        "Price is inside the entry zone — OK to enter if grade and trend still align.",
      suggestWaitForPrice: false,
      distanceToEntryPct,
    };
  }

  if (isBullish) {
    if (currentPrice > upperBound) {
      // Price ran above zone — wait for pullback.
      return {
        status: "extended",
        idealEntryPrice,
        waitForPrice: high,
        entryTimingNote:
          "Price ran above the entry zone — wait for a pullback into the zone before buying.",
        suggestWaitForPrice: true,
        distanceToEntryPct,
      };
    }
    // Price below zone — set a limit at ideal entry.
    return {
      status: "wait_for_price",
      idealEntryPrice,
      waitForPrice: idealEntryPrice,
      entryTimingNote:
        "Price is below the entry band — prefer a limit near ideal entry or a retest of the zone.",
      suggestWaitForPrice: true,
      distanceToEntryPct,
    };
  }

  // SHORT
  if (currentPrice < lowerBound) {
    // Price already dropped below the short zone — wait for a rally back up.
    return {
      status: "wait_for_price",
      idealEntryPrice,
      waitForPrice: idealEntryPrice,
      entryTimingNote:
        "Price has fallen below the short zone — wait for a rally back into the zone (or a fresh setup at lower levels).",
      suggestWaitForPrice: true,
      distanceToEntryPct,
    };
  }
  // Price above the short zone — extended past ideal short; wait for retest.
  return {
    status: "extended",
    idealEntryPrice,
    waitForPrice: high,
    entryTimingNote:
      "Price ran above the entry zone — wait for price to come back into the zone before shorting.",
    suggestWaitForPrice: true,
    distanceToEntryPct,
  };
}
