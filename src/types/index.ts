import type { CryptoQuotePair } from "@/config/market";

export type { CryptoQuotePair };

export type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1D" | "1W";

export type SignalAction =
  | "BUY NOW"
  | "SELL NOW"
  | "WAIT"
  | "HOLD"
  | "STRONG LONG"
  | "STRONG SHORT";

export type TradeType =
  | "spot"
  | "futures_long"
  | "futures_short"
  | "scalp"
  | "swing"
  | "breakout"
  | "reversal"
  | "india_cash"
  | "india_futures_long"
  | "india_futures_short"
  | "india_options";

/** Automated setup classification (9 styles). */
export type TradingStyle =
  | "scalping"
  | "intraday"
  | "swing"
  | "trend"
  | "breakout"
  | "reversal"
  | "range"
  | "momentum"
  | "mean_reversion";

export interface TradingStyleScore {
  style: TradingStyle;
  label: string;
  score: number;
  reasons: string[];
}

export interface TradingStyleAnalysis {
  primary: TradingStyle;
  primaryLabel: string;
  primaryScore: number;
  secondary?: TradingStyle;
  secondaryLabel?: string;
  secondaryScore?: number;
  scores: TradingStyleScore[];
  summary: string;
  suggestedHold: string;
}

export type MarketSegment =
  | "crypto"
  | "india_equity"
  | "india_futures"
  | "india_options";

export type QuoteCurrency = "USD" | "INR";

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CoinMarket {
  id: string;
  symbol: string;
  name: string;
  image: string;
  rank: number;
  /** USD price */
  price: number;
  quoteCurrency: "USD";
  change24h: number;
  change7d?: number;
  marketCap: number;
  volume24h: number;
  high24h?: number;
  low24h?: number;
}

export interface TradingSignal {
  id: string;
  symbol: string;
  /** Display pair e.g. BTC/USD */
  pairLabel: string;
  coinId: string;
  action: SignalAction;
  tradeType: TradeType;
  confidence: number;
  bullishScore: number;
  bearishScore: number;
  riskScore: number;
  entryZone: [number, number];
  exitZone: [number, number];
  stopLoss: number;
  takeProfit: number;
  takeProfit2?: number;
  trailingStop: number;
  riskReward: number;
  suggestedLeverage: string;
  durationEstimate: string;
  bestTimeframe: Timeframe;
  confirmations: string[];
  warnings: string[];
  timestamp: number;
  market: "spot" | "futures" | "india_equity" | "india_futures" | "india_options";
  currency?: QuoteCurrency;
  /** Live price the signal was generated against. */
  currentPrice?: number;
  /** A = high-quality multi-confirmed; C = low quality / wait. */
  quality?: SignalQuality;
  /** Probability % that the trade hits TP before SL (model estimate). */
  winProbability?: number;
  /** Plain-English reasons to take this trade. */
  whyBuy?: string[];
  whySell?: string[];
  /** Things that would invalidate the trade — exit immediately. */
  invalidation?: string[];
  /** Best UTC window to enter (e.g. "13:00–17:00 UTC — US session liquidity"). */
  idealEntryWindow?: string;
  /** Detected market regime for this asset. */
  regime?: CryptoMarketRegime;
  /** Trend on your selected timeframe (EMA stack). */
  chartTrend?: MarketTrendLabel;
  /** Trend on higher timeframe (e.g. 1h chart → 1D trend). */
  higherTfTrend?: MarketTrendLabel;
  /** Combined trend verdict for this coin. */
  overallTrend?: MarketTrendLabel;
  /** One-line trend readout for the card header. */
  trendSummary?: string;
  /** Plain-English what the trend means for trading. */
  trendDetail?: string;
  /** One-line, beginner-friendly summary. */
  oneLiner?: string;
  /** Suggested capital risk per trade as % of portfolio. */
  capitalRiskPercent?: number;
  /** When this directional bias was first issued (ms). */
  signalSince?: number;
  /** Why the label did or did not change on the latest refresh. */
  refreshNote?: string;
  /** Whether LTP is inside the entry zone. */
  entryTimingStatus?: "in_zone" | "wait_for_price" | "extended" | "not_applicable";
  /** Best price to wait for before entering (limit / alert level). */
  waitForPrice?: number;
  /** Target inside entry zone (mid-band). */
  idealEntryPrice?: number;
  /** Plain-English entry price guidance. */
  entryTimingNote?: string;
  /** True when you should not market-enter yet — wait for waitForPrice. */
  suggestWaitForPrice?: boolean;
  /** % distance from ideal entry (signed: + = above ideal). */
  distanceToEntryPct?: number;

  /** Pro-grade trade classification (A+/A/B/C/D). Layered over legacy `quality`. */
  tradeQuality?: TradeQuality;
  /** Beginner-friendly confidence band — Very High / High / Medium / Weak. */
  confidenceBand?: ConfidenceBand;
  /** What the user should do right now — aggressive / wait / avoid_chase / etc. */
  executionMode?: ExecutionMode;
  /** Plain-English instruction tied to executionMode (e.g. "Scale in at $7.55 and $7.50"). */
  executionPlan?: string;
  /** Multi-timeframe alignment breakdown (which TFs say what). */
  trendAlignment?: TrendAlignment;
  /** Structured warnings with severity (newer than plain `warnings` strings). */
  structuredWarnings?: TradeWarning[];
  /**
   * Weighted win-probability inputs — exposes the math behind the % so users
   * can see where conviction is coming from. Each component is 0-100.
   */
  winProbabilityBreakdown?: {
    trendAlignment: number;
    momentum: number;
    volume: number;
    volatility: number;
    structure: number;
    sentiment: number;
    liquidity: number;
  };
  /** Whether the signal is currently in "Capital Preservation Mode" (do not trade). */
  capitalPreservationMode?: boolean;
  /** Contextual narrative (replaces the generic commentary). */
  aiCommentary?: string;
  /** Auto-detected trading style (scalp, swing, breakout, etc.). */
  tradingStyle?: TradingStyleAnalysis;
}

export interface TrendAlignment {
  chart: MarketTrendLabel;
  higher: MarketTrendLabel;
  /** Even higher TF (e.g. 1D when chart=1h and higher=4h). */
  highest?: MarketTrendLabel;
  /** Number of TFs agreeing with the trade direction (0-3). */
  agreementCount: number;
  /** Score 0-100 for how aligned the trade is with broader trends. */
  alignmentScore: number;
}

export interface FuturesMetrics {
  symbol: string;
  fundingRate: number;
  openInterest: number;
  longShortRatio: number;
  liquidationLongZone?: number;
  liquidationShortZone?: number;
  squeezeRisk: "long" | "short" | "none";
  volatilityAlert: boolean;
}

export interface SentimentData {
  fearGreed: number;
  fearGreedLabel: string;
  newsScore: number;
  socialScore: number;
  overall: number;
  headlines: NewsItem[];
}

export interface NewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  sentiment: "bullish" | "bearish" | "neutral";
  score: number;
  coins: string[];
  publishedAt: number;
}

export interface IndicatorSnapshot {
  rsi: number;
  macd: { macd: number; signal: number; histogram: number };
  ema9: number;
  ema21: number;
  ema50: number;
  sma20: number;
  sma50: number;
  bb: { upper: number; middle: number; lower: number };
  atr: number;
  vwap: number;
  stochRsi: number;
  /** Average Directional Index 14 (>25 strong trend, <20 ranging). */
  adx: number;
  /** Last bar volume / 20-bar average (>1.5 = spike). */
  volumeSpike: number;
  /** % position in 20-bar range (0=low, 100=high). */
  rangePosition: number;
  trend: "bullish" | "bearish" | "neutral";
  trendStrength: number;
}

export type SignalQuality = "A" | "B" | "C";

/** Pro-grade trade classification — used in addition to SignalQuality for ranking. */
export type TradeQuality = "A+" | "A" | "B" | "C" | "D";

/**
 * Confidence band shown to the user — derived from numeric confidence.
 * 85+ very high · 70-84 high · 55-69 medium · <55 weak.
 */
export type ConfidenceBand = "Very High" | "High" | "Medium" | "Weak";

/**
 * What the user should *do* with this signal right now.
 *  - aggressive: market entry acceptable, conditions excellent
 *  - conservative: scale in at limit / wait for small pullback inside zone
 *  - wait_confirmation: setup forming, wait for confirmation candle
 *  - wait_retest: price extended, wait for retest into entry zone
 *  - avoid_chase: trend strong but you're late — do not chase
 *  - capital_preservation: do not trade — uncertainty too high
 *  - scale_in: split position across multiple limit prices
 */
export type ExecutionMode =
  | "aggressive"
  | "conservative"
  | "wait_confirmation"
  | "wait_retest"
  | "avoid_chase"
  | "capital_preservation"
  | "scale_in";

/** Severity tag for a warning — drives UI color + confidence penalty. */
export type WarningSeverity = "info" | "caution" | "high";

export interface TradeWarning {
  message: string;
  severity: WarningSeverity;
  /** Numeric confidence penalty applied by the engine (subtractive). */
  penalty?: number;
}

/** Setup grade shown on coin lists (may be WAIT / below trade threshold). */
export interface CoinGrade {
  symbol: string;
  coinId: string;
  quality: SignalQuality;
  action: SignalAction;
  confidence: number;
  tradeEligible: boolean;
}

/** Simple uptrend / downtrend / sideways label for UI. */
export type MarketTrendLabel = "Uptrend" | "Downtrend" | "Sideways";

export type CryptoMarketRegime =
  | "strong_uptrend"
  | "strong_downtrend"
  | "pullback_in_uptrend"
  | "pullback_in_downtrend"
  | "ranging"
  | "high_volatility"
  | "breakout"
  | "breakdown";

export interface PredictionResult {
  signal: TradingSignal | null;
  indicators: IndicatorSnapshot;
  support: number[];
  resistance: number[];
  fibLevels: Record<string, number>;
  commentary: string;
  candles: Candle[];
}

export interface WatchlistItem {
  symbol: string;
  coinId: string;
  addedAt: number;
  priceAlert?: { above?: number; below?: number };
}

export interface MarketSettings {
  minConfidence: number;
  demoMode: boolean;
  defaultTimeframe: Timeframe;
  refreshInterval: number;
}

export interface CryptoSettings extends MarketSettings {
  /** Display + chart symbol quote: BTC/USD vs BTC/USDT. */
  quotePair: CryptoQuotePair;
  /** Lower bar for crypto spot/futures scans (more setups, less strict R:R / confirmations). */
  relaxedCryptoSignals: boolean;
  /** Minutes to hold the same buy/sell label unless conviction changes materially. */
  signalLockMinutes: number;
}

export type IndiaSettings = MarketSettings;

export interface ApiHealth {
  provider: string;
  healthy: boolean;
  lastCheck: number;
  latencyMs: number;
  error?: string;
}
