import type { Candle, IndicatorSnapshot, Timeframe, TradingSignal } from "./index";

export type IndiaMarketType = "india_equity" | "india_futures" | "india_options";

export interface IndianStock {
  id: string;
  symbol: string;
  name: string;
  yahooSymbol: string;
  nseSymbol: string;
  rank: number;
  price: number;
  quoteCurrency: "INR";
  change24h: number;
  changePercent?: number;
  volume24h: number;
  high52w?: number;
  low52w?: number;
  segment: "equity" | "index";
}

export interface IndiaFnoMetrics {
  symbol: string;
  underlyingPrice: number;
  pcr: number;
  totalCallOi: number;
  totalPutOi: number;
  maxPainStrike: number;
  ivSkew: "call" | "put" | "neutral";
  trendBias: "bullish" | "bearish" | "neutral";
  volatilityAlert: boolean;
}

export interface OptionStrikeData {
  strike: number;
  callOi: number;
  putOi: number;
  callIv?: number;
  putIv?: number;
  callLtp?: number;
  putLtp?: number;
}

export interface OptionChainSnapshot {
  underlying: string;
  spotPrice: number;
  expiry: string;
  strikes: OptionStrikeData[];
  pcr: number;
  timestamp: number;
}

export type OptionTradeAction = "BUY CALL" | "SELL CALL" | "BUY PUT" | "SELL PUT" | "WAIT";

export interface OptionSignal {
  id: string;
  underlying: string;
  pairLabel: string;
  optionType: "CE" | "PE";
  strike: number;
  action: OptionTradeAction;
  side: "buy" | "sell";
  confidence: number;
  underlyingPrice: number;
  /** Current option premium (CE or PE LTP from chain). */
  premiumLtp: number;
  riskPercent: number;
  tradeDate: string;
  premiumZone: [number, number];
  targetPremium: number;
  stopPremium: number;
  riskReward: number;
  expiry: string;
  entryTiming: string;
  exitTiming: string;
  confirmations: string[];
  warnings: string[];
  newsImpact?: string;
  timestamp: number;
}

export interface IndiaNewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  sentiment: "bullish" | "bearish" | "neutral";
  score: number;
  category: "india" | "global";
  symbols: string[];
  impactScore: number;
  publishedAt: number;
}

export interface IndiaNewsSentiment {
  indiaNewsScore: number;
  globalNewsScore: number;
  overall: number;
  marketMood: "risk-on" | "risk-off" | "neutral";
  headlines: IndiaNewsItem[];
  warnings: string[];
}

export interface IndiaIndicatorSnapshot {
  rsi: number;
  macdHistogram: number;
  emaTrend: "bullish" | "bearish" | "neutral";
  priceVsVwap: "above" | "below";
  trendStrength: number;
  readings: string[];
}

export interface IndiaStockPick {
  id: string;
  symbol: string;
  name: string;
  pairLabel: string;
  action: "BUY" | "SELL" | "HOLD" | "WAIT";
  confidence: number;
  currentPrice: number;
  change24h: number;
  buyZone?: [number, number];
  sellZone?: [number, number];
  stopLoss: number;
  targetPrice: number;
  riskPercent: number;
  suggestedRiskPerTrade: number;
  buyDate: string;
  sellDate: string;
  buyTiming: string;
  sellTiming: string;
  holdDuration: string;
  indicators: IndiaIndicatorSnapshot;
  marketWasOpen: boolean;
  newsBias: number;
  newsHeadlines: string[];
  globalImpact: string;
  technicalSummary: string;
  timestamp: number;
}

export type IndexLtpSource = "nse_index" | "nse_chain" | "yahoo" | "demo";

export interface IndiaOptionsPlaybook {
  underlying: string;
  spotPrice: number;
  ltpSource?: IndexLtpSource;
  expiry: string;
  buyCall: OptionSignal[];
  sellCall: OptionSignal[];
  buyPut: OptionSignal[];
  sellPut: OptionSignal[];
  metrics: IndiaFnoMetrics;
  marketCommentary: string;
}

export interface IndiaPredictionResult {
  signal: TradingSignal | null;
  optionSignals: OptionSignal[];
  fnoMetrics?: IndiaFnoMetrics;
  indicators: IndicatorSnapshot;
  support: number[];
  resistance: number[];
  commentary: string;
  candles: Candle[];
}

export type IndiaTradingSignal = TradingSignal & {
  market: IndiaMarketType;
  currency: "INR";
};

export interface IndiaBatchParams {
  stocks: IndianStock[];
  timeframe: Timeframe;
  market: IndiaMarketType;
  minConfidence: number;
  demoMode: boolean;
}
