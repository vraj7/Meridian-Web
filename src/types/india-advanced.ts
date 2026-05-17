import type { IndiaSectorId } from "@/config/india-sectors";
import type { IndiaNewsSentiment, IndiaStockPick, IndiaOptionsPlaybook } from "./india";
import type { NseMarketStatus } from "@/lib/nse-market-hours";

export type MarketRegime =
  | "trending_up"
  | "trending_down"
  | "sideways"
  | "high_volatility"
  | "panic"
  | "short_covering"
  | "bull_trap"
  | "bear_trap";

export interface SectorScore {
  id: IndiaSectorId;
  name: string;
  momentum: number;
  avgChange24h: number;
  newsBias: number;
  strengthRank: number;
  rotationSignal: "leading" | "lagging" | "neutral";
  stockCount: number;
}

export interface OiInsight {
  type: "long_buildup" | "short_buildup" | "long_unwinding" | "short_covering" | "neutral";
  label: string;
  confidence: number;
}

export interface IndiaAccuracyScore {
  bullish: number;
  bearish: number;
  confidence: number;
  risk: number;
  institutional: number;
  sectorAlignment: number;
  newsAlignment: number;
  technical: number;
  oiConfirmation: number;
  action: "STRONG BUY" | "BUY" | "HOLD" | "SELL" | "STRONG SELL" | "WAIT";
  probability: number;
  confirmations: string[];
  warnings: string[];
}

export interface IndiaTerminalSignal extends IndiaStockPick {
  accuracy: IndiaAccuracyScore;
  sector: IndiaSectorId;
  sectorName: string;
  oiInsight?: OiInsight;
  regime: MarketRegime;
}

export interface FiiDiiData {
  fiiBuy: number;
  fiiSell: number;
  fiiNet: number;
  diiBuy: number;
  diiSell: number;
  diiNet: number;
  date: string;
}

export interface IndiaTerminalData {
  marketStatus: NseMarketStatus;
  regime: MarketRegime;
  regimeLabel: string;
  news: IndiaNewsSentiment;
  sectors: SectorScore[];
  fiiDii: FiiDiiData | null;
  signals: IndiaTerminalSignal[];
  buySignals: IndiaTerminalSignal[];
  sellSignals: IndiaTerminalSignal[];
  optionsPlaybooks: IndiaOptionsPlaybook[];
  commentary: string;
}
