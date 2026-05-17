import type { TradingStyle } from "@/types";

export interface HelpEntry {
  label: string;
  /** One sentence a beginner understands. */
  plain: string;
  /** Optional extra detail. */
  detail?: string;
}

export const TRADING_STYLE_HELP: Record<TradingStyle, HelpEntry> = {
  scalping: {
    label: "Scalping",
    plain: "Very quick trades — in and out within minutes for small profits.",
    detail: "Works on fast charts (1m–5m) when price is moving with volume. Stops are tight.",
  },
  intraday: {
    label: "Intraday / day trading",
    plain: "Open and close the same day — no overnight hold.",
    detail: "Uses session trends and VWAP (average price today). Good for 15m–1h charts.",
  },
  swing: {
    label: "Swing trading",
    plain: "Hold for several days to catch a bigger move.",
    detail: "Looks at daily/4h trends and bounces off support or resistance.",
  },
  trend: {
    label: "Trend trading",
    plain: "Ride the direction the market is already moving — “the trend is your friend.”",
    detail: "Needs a clear uptrend or downtrend on the chart and higher timeframes agreeing.",
  },
  breakout: {
    label: "Breakout trading",
    plain: "Enter when price breaks out of a tight range with strong volume.",
    detail: "Often follows a quiet squeeze; you trade the expansion, not the chop.",
  },
  reversal: {
    label: "Reversal trading",
    plain: "Bet that an overextended move will snap back the other way.",
    detail: "Looks for exhaustion — very high/low RSI, reversal candles, or divergence.",
  },
  range: {
    label: "Range trading",
    plain: "Buy near the bottom and sell near the top of a sideways box.",
    detail: "Market is not trending (low ADX). Fade moves to the edges of the range.",
  },
  momentum: {
    label: "Momentum trading",
    plain: "Jump on strong moves that are speeding up with volume.",
    detail: "Large candles and rising trend strength — don’t fight the impulse.",
  },
  mean_reversion: {
    label: "Mean reversion",
    plain: "Price stretched too far from “fair” — expect a pullback toward average.",
    detail: "Uses VWAP, moving averages, or Bollinger Bands when price is at an extreme.",
  },
};

export const SIGNAL_TERM_HELP = {
  tradingStyle: {
    label: "Trading style",
    plain: "How long and how you would trade this setup — auto-detected from the chart.",
    detail: "The % is how well the chart matches that style right now.",
  },
  confidence: {
    label: "Confidence",
    plain: "How strongly indicators agree on this direction (not a guarantee).",
    detail: "Higher is better, but always check entry zone and warnings too.",
  },
  winProbability: {
    label: "Win probability",
    plain: "Model estimate that price hits target before stop — not a promise.",
    detail: "Based on trend, volume, structure, and sentiment together.",
  },
  riskReward: {
    label: "R:R (risk/reward)",
    plain: "How much you could make vs how much you risk if stopped out.",
    detail: "2x means target is twice as far as your stop. Below 1.4x setups are filtered out.",
  },
  riskScore: {
    label: "Risk score",
    plain: "How volatile or dangerous this trade is (0 = calm, 100 = very risky).",
    detail: "High volatility, crowded positioning, or choppy regime raise the score.",
  },
  entryZone: {
    label: "Entry zone",
    plain: "Price range where entering is fair — not too early, not chasing.",
    detail: "Wait for price to come into this band; use a limit order if needed.",
  },
  stopLoss: {
    label: "Stop loss",
    plain: "Price where you exit to cap loss if the trade is wrong.",
    detail: "Set this on your exchange before or right after entry.",
  },
  takeProfit: {
    label: "Take profit",
    plain: "Target price where you plan to take gains (TP2 is a second target).",
    detail: "You can scale out: sell part at TP1 and part at TP2.",
  },
  trailingStop: {
    label: "Trail stop",
    plain: "A stop that can move in your favor as price goes your way.",
    detail: "Helps lock profit on trends without guessing the exact top.",
  },
  trendAlignment: {
    label: "Trend alignment",
    plain: "How many timeframes agree with your trade direction.",
    detail: "3/3 means chart, higher, and longest TF all point the same way.",
  },
  qualityGrade: {
    label: "Quality grade",
    plain: "Overall setup strength from A+ (best) to D (avoid).",
    detail: "Combines confidence, trend match, risk/reward, and warnings.",
  },
  executionMode: {
    label: "Execution mode",
    plain: "What to do right now — enter, wait, scale in, or sit out.",
    detail: "Follow this if you are unsure whether to market-buy or wait.",
  },
  hold: {
    label: "Hold time",
    plain: "Roughly how long this style of trade usually lasts.",
    detail: "Scalps are minutes; swings can be days. Your chart timeframe matters too.",
  },
  capitalRisk: {
    label: "Portfolio risk",
    plain: "Suggested % of your account to risk on this single trade.",
    detail: "Many traders use 0.5–1% per trade so one loss does not wipe the account.",
  },
  vwap: {
    label: "VWAP",
    plain: "Volume-weighted average price — “fair price” for today’s session.",
    detail: "Price above VWAP often means buyers in control intraday; below means sellers.",
  },
  atr: {
    label: "ATR",
    plain: "Average True Range — how much price typically moves per bar.",
    detail: "Used to set stop and target distances that fit current volatility.",
  },
  adx: {
    label: "ADX",
    plain: "Trend strength meter. Low = sideways; high = strong trend.",
    detail: "Under ~20 often means range trading; above ~25 favors trend/breakout styles.",
  },
  rsi: {
    label: "RSI",
    plain: "Momentum oscillator. High = stretched up; low = stretched down.",
    detail: "Not buy/sell alone — context matters (trend vs reversal).",
  },
  signalStability: {
    label: "Signal stability",
    plain: "Keeps the same buy/sell label for a few minutes so labels don’t flicker every scan.",
    detail: "Adjust in Crypto settings. Reset locks clears the memory.",
  },
} as const satisfies Record<string, HelpEntry>;

export type SignalTermKey = keyof typeof SIGNAL_TERM_HELP;

export const TRADING_STYLE_ORDER: TradingStyle[] = [
  "scalping",
  "intraday",
  "swing",
  "trend",
  "breakout",
  "reversal",
  "range",
  "momentum",
  "mean_reversion",
];
