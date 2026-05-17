export type IndiaSectorId =
  | "banking"
  | "it"
  | "pharma"
  | "auto"
  | "fmcg"
  | "energy"
  | "psu"
  | "infra"
  | "metal"
  | "telecom"
  | "realty"
  | "financial_services"
  | "chemicals"
  | "defence"
  | "railway"
  | "midcap"
  | "smallcap";

export interface IndiaSectorMeta {
  id: IndiaSectorId;
  name: string;
  indexSymbol?: string;
  yahooIndex?: string;
}

export const INDIA_SECTORS: IndiaSectorMeta[] = [
  { id: "banking", name: "Banking", yahooIndex: "^NSEBANK" },
  { id: "it", name: "IT", yahooIndex: "^CNXIT" },
  { id: "pharma", name: "Pharma", yahooIndex: "^CNXPHARMA" },
  { id: "auto", name: "Auto", yahooIndex: "^CNXAUTO" },
  { id: "fmcg", name: "FMCG", yahooIndex: "^CNXFMCG" },
  { id: "energy", name: "Energy", yahooIndex: "^CNXENERGY" },
  { id: "psu", name: "PSU" },
  { id: "infra", name: "Infrastructure" },
  { id: "metal", name: "Metal", yahooIndex: "^CNXMETAL" },
  { id: "telecom", name: "Telecom" },
  { id: "realty", name: "Realty", yahooIndex: "^CNXREALTY" },
  { id: "financial_services", name: "Financial Services", yahooIndex: "NIFTY_FIN_SERVICE.NS" },
  { id: "chemicals", name: "Chemicals" },
  { id: "defence", name: "Defence" },
  { id: "railway", name: "Railway" },
  { id: "midcap", name: "Midcap", yahooIndex: "^CNXMIDCAP" },
  { id: "smallcap", name: "Smallcap", yahooIndex: "^CNXSMALLCAP" },
];

/** Symbol → sector mapping (NIFTY 50 + common names) */
export const STOCK_SECTOR_MAP: Record<string, IndiaSectorId> = {
  HDFCBANK: "banking",
  ICICIBANK: "banking",
  SBIN: "banking",
  AXISBANK: "banking",
  KOTAKBANK: "banking",
  INDUSINDBK: "banking",
  BAJFINANCE: "financial_services",
  BAJAJFINSV: "financial_services",
  TCS: "it",
  INFY: "it",
  HCLTECH: "it",
  WIPRO: "it",
  TECHM: "it",
  SUNPHARMA: "pharma",
  DRREDDY: "pharma",
  CIPLA: "pharma",
  MARUTI: "auto",
  "M&M": "auto",
  TATAMOTORS: "auto",
  BAJAJ_AUTO: "auto",
  HEROMOTOCO: "auto",
  HINDUNILVR: "fmcg",
  ITC: "fmcg",
  NESTLEIND: "fmcg",
  BRITANNIA: "fmcg",
  RELIANCE: "energy",
  ONGC: "energy",
  BPCL: "energy",
  COALINDIA: "psu",
  NTPC: "psu",
  POWERGRID: "psu",
  LT: "infra",
  ADANIENT: "infra",
  ADANIPORTS: "infra",
  JSWSTEEL: "metal",
  TATASTEEL: "metal",
  HINDALCO: "metal",
  BHARTIARTL: "telecom",
  ASIANPAINT: "chemicals",
  ULTRACEMCO: "infra",
  TITAN: "fmcg",
};

export function getSectorForSymbol(symbol: string): IndiaSectorId {
  return STOCK_SECTOR_MAP[symbol.toUpperCase()] ?? "midcap";
}

/** Macro headline rules → sector impact */
export const MACRO_SECTOR_RULES: Array<{
  keywords: string[];
  bullishSectors: IndiaSectorId[];
  bearishSectors: IndiaSectorId[];
  label: string;
}> = [
  { keywords: ["rate cut", "rbi cut", "repo cut"], bullishSectors: ["banking", "realty", "auto"], bearishSectors: [], label: "RBI easing" },
  { keywords: ["rate hike", "repo hike", "tightening"], bullishSectors: [], bearishSectors: ["banking", "realty", "auto"], label: "RBI tightening" },
  { keywords: ["crude surge", "oil spike", "brent rally"], bullishSectors: ["energy"], bearishSectors: ["auto", "chemicals"], label: "Crude spike" },
  { keywords: ["crude fall", "oil drop"], bullishSectors: ["auto", "fmcg"], bearishSectors: ["energy"], label: "Crude decline" },
  { keywords: ["fed pause", "tech rally", "nasdaq"], bullishSectors: ["it"], bearishSectors: [], label: "US tech positive" },
  { keywords: ["inflation", "cpi rise", "wpi"], bullishSectors: [], bearishSectors: ["fmcg", "realty"], label: "Inflation pressure" },
  { keywords: ["budget", "capex", "infrastructure push"], bullishSectors: ["infra", "defence", "railway"], bearishSectors: [], label: "Fiscal stimulus" },
  { keywords: ["fii sell", "fii outflow", "foreign sell"], bullishSectors: [], bearishSectors: ["banking", "it"], label: "FII selling" },
  { keywords: ["fii buy", "fii inflow", "foreign buy"], bullishSectors: ["banking", "it"], bearishSectors: [], label: "FII buying" },
];

export const EXTENDED_INDIA_STOCKS = [
  { symbol: "HDFCBANK", name: "HDFC Bank", yahoo: "HDFCBANK.NS", nse: "HDFCBANK" },
  { symbol: "INDUSINDBK", name: "IndusInd Bank", yahoo: "INDUSINDBK.NS", nse: "INDUSINDBK" },
  { symbol: "BAJAJFINSV", name: "Bajaj Finserv", yahoo: "BAJAJFINSV.NS", nse: "BAJAJFINSV" },
  { symbol: "TECHM", name: "Tech Mahindra", yahoo: "TECHM.NS", nse: "TECHM" },
  { symbol: "DRREDDY", name: "Dr Reddy's", yahoo: "DRREDDY.NS", nse: "DRREDDY" },
  { symbol: "CIPLA", name: "Cipla", yahoo: "CIPLA.NS", nse: "CIPLA" },
  { symbol: "HEROMOTOCO", name: "Hero MotoCorp", yahoo: "HEROMOTOCO.NS", nse: "HEROMOTOCO" },
  { symbol: "BRITANNIA", name: "Britannia", yahoo: "BRITANNIA.NS", nse: "BRITANNIA" },
  { symbol: "BPCL", name: "BPCL", yahoo: "BPCL.NS", nse: "BPCL" },
  { symbol: "HINDALCO", name: "Hindalco", yahoo: "HINDALCO.NS", nse: "HINDALCO" },
  { symbol: "ADANIPORTS", name: "Adani Ports", yahoo: "ADANIPORTS.NS", nse: "ADANIPORTS" },
];
