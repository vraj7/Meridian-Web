import type { Candle, FuturesMetrics, MarketTrendLabel } from "@/types";

export type FuturesMtfTimeframe = "5m" | "15m" | "1h" | "4h" | "1d";

export type FuturesIntradayDirection = "LONG" | "SHORT";

export type FuturesSetupGrade = "A+" | "A" | "B" | "C";

export type FuturesConfidenceTier = "Elite" | "Sniper" | "High Confidence" | "Moderate";

export type FuturesHoldingEstimate = 15 | 30 | 45 | 60;

export type IntradayEntryTimingStatus =
  | "in_zone"
  | "wait_for_price"
  | "extended"
  | "not_applicable";

export interface FuturesMtfCandles {
  "5m": Candle[];
  "15m": Candle[];
  "1h": Candle[];
  "4h": Candle[];
  "1d": Candle[];
}

export interface ExtendedIndicatorSet {
  ema9: number;
  ema20: number;
  ema50: number;
  ema100: number;
  ema200: number;
  rsi: number;
  macd: { macd: number; signal: number; histogram: number };
  stochRsi: number;
  momentum: number;
  adx: number;
  plusDi: number;
  minusDi: number;
  atr: number;
  bb: { upper: number; middle: number; lower: number };
  keltner: { upper: number; middle: number; lower: number };
  vwap: number;
  relativeVolume: number;
  obvSlope: number;
  trend: MarketTrendLabel;
}

export interface MarketStructureSnapshot {
  bias: "bullish" | "bearish" | "neutral";
  score: number;
  higherHigh: boolean;
  higherLow: boolean;
  lowerHigh: boolean;
  lowerLow: boolean;
  bos: boolean;
  choch: boolean;
  continuation: boolean;
  reversal: boolean;
  events: string[];
}

export interface LevelZone {
  price: number;
  strength: number;
  kind: "support" | "resistance" | "demand" | "supply" | "poc" | "vah" | "val";
}

export interface VolumeProfileLevels {
  poc: number;
  vah: number;
  val: number;
  nodes: number[];
}

export interface LiquiditySnapshot {
  equalHighs: number[];
  equalLows: number[];
  stopHuntRisk: number;
  fvgs: Array<{ high: number; low: number; bullish: boolean }>;
  orderBlocks: Array<{ high: number; low: number; bullish: boolean }>;
  liquiditySweep: boolean;
}

export interface DivergenceSnapshot {
  rsi: "bullish" | "bearish" | "none";
  macd: "bullish" | "bearish" | "none";
  stochRsi: "bullish" | "bearish" | "none";
  score: number;
}

export interface FuturesIntradayContext {
  btcTrend: MarketTrendLabel;
  btcDominance?: number;
  fearGreed?: number;
  btcCorrelation: number;
}

export interface FuturesIntradaySignal {
  id: string;
  symbol: string;
  coinId: string;
  pairLabel: string;
  direction: FuturesIntradayDirection;
  entry: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  tp3: number;
  tp4?: number;
  riskPercent: number;
  rewardPercent: number;
  riskReward: number;
  confidence: number;
  confidenceTier: FuturesConfidenceTier;
  winProbability: number;
  riskScore: number;
  setupGrade: FuturesSetupGrade;
  breakoutGrade: FuturesSetupGrade;
  holdingMinutes: FuturesHoldingEstimate;
  stopLossQuality: number;
  timestamp: number;
  currentPrice: number;
  trendByTf: Record<FuturesMtfTimeframe, MarketTrendLabel>;
  structure: MarketStructureSnapshot;
  indicators15m: ExtendedIndicatorSet;
  liquidity: LiquiditySnapshot;
  divergences: DivergenceSnapshot;
  patterns: string[];
  candleQuality: string;
  volumeNote: string;
  fundingNote: string;
  oiNote: string;
  btcNote: string;
  smcNotes: string[];
  confirmations: string[];
  warnings: string[];
  invalidation: string[];
  aiReasoning: string;
  positionPlan: string;
  futures?: FuturesMetrics;
  entryZone: [number, number];
  idealEntryPrice: number;
  entryTimingStatus: IntradayEntryTimingStatus;
  entryTimingNote: string;
  readyToEnter: boolean;
  distanceToEntryPct: number;
}

export interface FuturesMtfScanInput {
  symbol: string;
  coinId: string;
  candles: FuturesMtfCandles;
  futures?: FuturesMetrics;
  context: FuturesIntradayContext;
  currentPrice?: number;
}

export type FuturesIntradayAssessmentStatus =
  | "signal"
  | "watch"
  | "filtered"
  | "no_data"
  | "no_bias";

/** Per-coin scan row — shown for the full universe even when no trade passes. */
export interface FuturesIntradayAssessment {
  symbol: string;
  coinId: string;
  pairLabel: string;
  status: FuturesIntradayAssessmentStatus;
  direction?: FuturesIntradayDirection;
  confidence: number;
  setupGrade?: FuturesSetupGrade;
  trend15m?: MarketTrendLabel;
  rejectReason?: string;
}

export interface FuturesMtfScanResult {
  signals: FuturesIntradaySignal[];
  assessments: FuturesIntradayAssessment[];
  scanned: number;
  rejected: number;
}
