export enum SignalDirection {
  LONG = 'LONG',
  SHORT = 'SHORT',
  NEUTRAL = 'NEUTRAL',
}

export type DailyTrend = 'uptrend' | 'downtrend' | 'sideways';

export interface Kline {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

export interface SignalComponents {
  dailyTrend: number;
  momentum4h: number;
  cvdDivergence: number;
  oiChange: number;
  funding: number;
  newsSentiment: number;
  volatilityPenalty: number;
  fearGreed: number;
  btcDominance: number;
  liquidationPenalty: number;
  backtestDiscount: number;
}

export interface TradingSignalDto {
  symbol: string;
  pair: string;
  direction: SignalDirection;
  confidence: number;
  rawConfidence: number;
  weakSignal: boolean;
  entryPrice: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  riskReward1: number;
  riskReward2: number;
  dailyTrend: DailyTrend;
  adxDaily: number;
  atrRatio: number;
  components: SignalComponents;
  notes: string[];
  generatedAt: string;
}

export interface BacktestResultDto {
  symbol: string;
  days: number;
  totalReturnPct: number;
  sharpeRatio: number;
  maxDrawdownPct: number;
  winRatePct: number;
  avgRiskReward: number;
  profitFactor: number;
  totalTrades: number;
  poorMetrics: boolean;
  confidenceDiscount: number;
  generatedAt: string;
}

export interface CvdSnapshot {
  symbol: string;
  cvd1h: number;
  priceHigh1h: number;
  priceLow1h: number;
  prevPriceHigh: number;
  prevPriceLow: number;
  prevCvdHigh: number;
  prevCvdLow: number;
  bullishDivergence: boolean;
  bearishDivergence: boolean;
  /** Taker buy minus sell as fraction of recent notional (from trades feed). */
  netBuyRatio?: number;
  updatedAt: number;
}

export interface OiSnapshot {
  symbol: string;
  values: { timestamp: number; openInterest: number }[];
}

export interface MarketContext {
  fearGreedIndex: number;
  fearGreedLabel: string;
  btcDominance: number;
  btcDominanceChange24h: number;
}

export interface LiquidationCluster {
  price: number;
  volumeUsd: number;
}

export interface PairMarketData {
  symbol: string;
  klines1h: Kline[];
  klines4h: Kline[];
  klines1d: Kline[];
  openInterest: number;
  oiHistory: OiSnapshot['values'];
  fundingRate: number;
  fundingRateAvg30d: number;
  orderBookMid: number;
  cvd: CvdSnapshot | null;
  liquidations: LiquidationCluster[];
  newsPositive: number;
  newsNegative: number;
}
