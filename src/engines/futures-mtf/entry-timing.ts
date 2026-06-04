import type { Candle } from "@/types";
import type {
  ExtendedIndicatorSet,
  IntradayEntryTimingStatus,
} from "@/types/futures-intraday";
import type { LevelMapResult } from "./levels-engine";

export type { IntradayEntryTimingStatus };

/** Floor for ideal-entry distance (%). Crypto needs more slack than 0.55%. */
export const INTRADAY_ENTRY_DISTANCE_MIN_PCT = 0.75;

/** Ceiling — beyond this, always wait even if in zone. */
export const INTRADAY_ENTRY_DISTANCE_MAX_PCT = 2.5;

const ZONE_TOLERANCE = 0.0025;

export interface IntradayEntryTiming {
  status: IntradayEntryTimingStatus;
  entryZone: [number, number];
  idealEntryPrice: number;
  waitForPrice?: number;
  entryTimingNote: string;
  suggestWaitForPrice: boolean;
  distanceToEntryPct: number;
  /** True only when price and 5m tape say enter now (used for alerts). */
  readyToEnter: boolean;
}

/** Pullback/rally band for 15m intraday execution. */
export function buildIntradayEntryZone(params: {
  direction: "LONG" | "SHORT";
  price: number;
  ind15: ExtendedIndicatorSet;
  levels: LevelMapResult;
}): [number, number] {
  const { direction, price, ind15, levels } = params;
  const band = Math.max(ind15.atr * 0.4, price * 0.0012);

  if (direction === "LONG") {
    const support = levels.supports[0]?.price;
    let low = Math.min(
      support ? support * 1.001 : price - band,
      price - band,
      ind15.vwap - band * 0.5
    );
    const high = Math.max(price, ind15.vwap, price + band * 0.25);
    if (low >= high) low = high - band * 0.2;
    return [low, high];
  }

  const resistance = levels.resistances[0]?.price;
  const low = Math.min(price, ind15.vwap, price - band * 0.25);
  let high = Math.max(
    resistance ? resistance * 0.999 : price + band,
    price + band,
    ind15.vwap + band * 0.25
  );
  if (low >= high) high = low + band * 0.2;
  return [low, high];
}

function confirm5mTape(c5: Candle[], direction: "LONG" | "SHORT"): boolean {
  const last = c5[c5.length - 1];
  if (!last) return false;
  const bullish = last.close > last.open;
  const body = Math.abs(last.close - last.open);
  const range = last.high - last.low;
  if (range <= 0 || body / range < 0.2) return false;
  return direction === "LONG" ? bullish : !bullish;
}

/** Volatility-aware max % from ideal entry (typical 0.75–2.2% on alts). */
export function maxEntryDistancePct(price: number, atr: number, zoneWidth: number): number {
  const atrPct = price > 0 ? (atr / price) * 100 * 0.45 : 1;
  const zonePct = price > 0 ? (zoneWidth / price) * 100 * 0.35 : 1;
  return Math.min(
    INTRADAY_ENTRY_DISTANCE_MAX_PCT,
    Math.max(INTRADAY_ENTRY_DISTANCE_MIN_PCT, atrPct, zonePct)
  );
}

export function resolveIntradayEntryTiming(params: {
  direction: "LONG" | "SHORT";
  currentPrice: number;
  entryZone: [number, number];
  candles5m: Candle[];
  atr: number;
}): IntradayEntryTiming {
  const { direction, currentPrice, entryZone, candles5m, atr } = params;
  const isBullish = direction === "LONG";
  const [low, high] = entryZone;
  const sortedLow = Math.min(low, high);
  const sortedHigh = Math.max(low, high);

  const idealEntryPrice = isBullish
    ? sortedLow + (sortedHigh - sortedLow) * 0.35
    : sortedLow + (sortedHigh - sortedLow) * 0.65;

  const lowerBound = sortedLow * (1 - ZONE_TOLERANCE);
  const upperBound = sortedHigh * (1 + ZONE_TOLERANCE);
  const inZone =
    currentPrice >= lowerBound && currentPrice <= upperBound;

  const distanceToEntryPct =
    idealEntryPrice > 0
      ? Math.round(((currentPrice - idealEntryPrice) / idealEntryPrice) * 1000) / 10
      : 0;

  const tapeOk = confirm5mTape(candles5m, direction);
  const zoneWidth = sortedHigh - sortedLow;
  const maxDist = maxEntryDistancePct(currentPrice, atr, zoneWidth);
  const dist = Math.abs(distanceToEntryPct);
  const positionInZone =
    zoneWidth > 0 ? (currentPrice - sortedLow) / zoneWidth : 0.5;
  /** LONG: lower/mid zone · SHORT: upper/mid zone (sell rally / buy dip). */
  const inFavorableSlice = isBullish ? positionInZone <= 0.55 : positionInZone >= 0.45;
  const nearIdeal = dist <= maxDist;
  const readyNow =
    inZone && tapeOk && (nearIdeal || (inFavorableSlice && dist <= maxDist * 1.35));

  if (readyNow) {
    return {
      status: "in_zone",
      entryZone: [sortedLow, sortedHigh],
      idealEntryPrice,
      entryTimingNote: nearIdeal
        ? "Price is in the entry zone with 5m confirmation — enter now."
        : `In favorable zone (${Math.round(positionInZone * 100)}% across band) with 5m confirm — enter now.`,
      suggestWaitForPrice: false,
      distanceToEntryPct,
      readyToEnter: true,
    };
  }

  if (inZone && tapeOk) {
    return {
      status: "in_zone",
      entryZone: [sortedLow, sortedHigh],
      idealEntryPrice,
      waitForPrice: idealEntryPrice,
      entryTimingNote: `In zone but ${dist.toFixed(1)}% from ideal (max ${maxDist.toFixed(1)}%) — limit near $${idealEntryPrice.toFixed(4)}`,
      suggestWaitForPrice: true,
      distanceToEntryPct,
      readyToEnter: false,
    };
  }

  if (isBullish) {
    if (currentPrice > upperBound) {
      return {
        status: "extended",
        entryZone: [sortedLow, sortedHigh],
        idealEntryPrice,
        waitForPrice: sortedHigh,
        entryTimingNote: "Price above entry zone — wait for pullback before buying.",
        suggestWaitForPrice: true,
        distanceToEntryPct,
        readyToEnter: false,
      };
    }
    return {
      status: "wait_for_price",
      entryZone: [sortedLow, sortedHigh],
      idealEntryPrice,
      waitForPrice: idealEntryPrice,
      entryTimingNote: "Price below zone — wait for retest into entry band.",
      suggestWaitForPrice: true,
      distanceToEntryPct,
      readyToEnter: false,
    };
  }

  if (currentPrice < lowerBound) {
    return {
      status: "wait_for_price",
      entryZone: [sortedLow, sortedHigh],
      idealEntryPrice,
      waitForPrice: idealEntryPrice,
      entryTimingNote: "Price below short zone — wait for rally into entry band.",
      suggestWaitForPrice: true,
      distanceToEntryPct,
      readyToEnter: false,
    };
  }

  return {
    status: "extended",
    entryZone: [sortedLow, sortedHigh],
    idealEntryPrice,
    waitForPrice: sortedHigh,
    entryTimingNote: "Price above short zone — wait for price back into band.",
    suggestWaitForPrice: true,
    distanceToEntryPct,
    readyToEnter: false,
  };
}
