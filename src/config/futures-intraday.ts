/** Minimum confidence % for 15m intraday futures MTF signals to appear. */
export const FUTURES_INTRADAY_MIN_CONFIDENCE = 70;

/** Breakout grades that can become a live intraday signal (with min confidence). */
export const FUTURES_INTRADAY_ALLOWED_GRADES = ["A+", "A", "B"] as const;

import { CRYPTO_ALERT_RESCAN_MS } from "./crypto-alerts";

/** Default background rescan on Intraday tab when alerts are enabled. */
export const FUTURES_INTRADAY_RESCAN_MS = CRYPTO_ALERT_RESCAN_MS;
