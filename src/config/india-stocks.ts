/** NIFTY 50 constituents + key indices (NSE). Yahoo symbols use .NS suffix. */
export const INDIA_INDICES = [
  { symbol: "NIFTY", name: "Nifty 50", yahoo: "^NSEI", nse: "NIFTY" },
  { symbol: "BANKNIFTY", name: "Nifty Bank", yahoo: "^NSEBANK", nse: "BANKNIFTY" },
  { symbol: "SENSEX", name: "BSE Sensex", yahoo: "^BSESN", nse: "SENSEX" },
  { symbol: "FINNIFTY", name: "Nifty Financial", yahoo: "^CNXFIN", nse: "FINNIFTY" },
] as const;

export const NIFTY_50_STOCKS = [
  { symbol: "RELIANCE", name: "Reliance Industries", yahoo: "RELIANCE.NS", nse: "RELIANCE" },
  { symbol: "TCS", name: "Tata Consultancy", yahoo: "TCS.NS", nse: "TCS" },
  { symbol: "HDFCBANK", name: "HDFC Bank", yahoo: "HDFCBANK.NS", nse: "HDFCBANK" },
  { symbol: "INFY", name: "Infosys", yahoo: "INFY.NS", nse: "INFY" },
  { symbol: "ICICIBANK", name: "ICICI Bank", yahoo: "ICICIBANK.NS", nse: "ICICIBANK" },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", yahoo: "HINDUNILVR.NS", nse: "HINDUNILVR" },
  { symbol: "ITC", name: "ITC", yahoo: "ITC.NS", nse: "ITC" },
  { symbol: "SBIN", name: "State Bank of India", yahoo: "SBIN.NS", nse: "SBIN" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", yahoo: "BHARTIARTL.NS", nse: "BHARTIARTL" },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", yahoo: "KOTAKBANK.NS", nse: "KOTAKBANK" },
  { symbol: "LT", name: "Larsen & Toubro", yahoo: "LT.NS", nse: "LT" },
  { symbol: "AXISBANK", name: "Axis Bank", yahoo: "AXISBANK.NS", nse: "AXISBANK" },
  { symbol: "ASIANPAINT", name: "Asian Paints", yahoo: "ASIANPAINT.NS", nse: "ASIANPAINT" },
  { symbol: "MARUTI", name: "Maruti Suzuki", yahoo: "MARUTI.NS", nse: "MARUTI" },
  { symbol: "TITAN", name: "Titan Company", yahoo: "TITAN.NS", nse: "TITAN" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", yahoo: "BAJFINANCE.NS", nse: "BAJFINANCE" },
  { symbol: "HCLTECH", name: "HCL Technologies", yahoo: "HCLTECH.NS", nse: "HCLTECH" },
  { symbol: "WIPRO", name: "Wipro", yahoo: "WIPRO.NS", nse: "WIPRO" },
  { symbol: "ULTRACEMCO", name: "UltraTech Cement", yahoo: "ULTRACEMCO.NS", nse: "ULTRACEMCO" },
  { symbol: "SUNPHARMA", name: "Sun Pharma", yahoo: "SUNPHARMA.NS", nse: "SUNPHARMA" },
  { symbol: "NTPC", name: "NTPC", yahoo: "NTPC.NS", nse: "NTPC" },
  { symbol: "POWERGRID", name: "Power Grid", yahoo: "POWERGRID.NS", nse: "POWERGRID" },
  { symbol: "M&M", name: "Mahindra & Mahindra", yahoo: "M&M.NS", nse: "M&M" },
  { symbol: "TATAMOTORS", name: "Tata Motors", yahoo: "TATAMOTORS.NS", nse: "TATAMOTORS" },
  { symbol: "ADANIENT", name: "Adani Enterprises", yahoo: "ADANIENT.NS", nse: "ADANIENT" },
  { symbol: "ONGC", name: "ONGC", yahoo: "ONGC.NS", nse: "ONGC" },
  { symbol: "COALINDIA", name: "Coal India", yahoo: "COALINDIA.NS", nse: "COALINDIA" },
  { symbol: "JSWSTEEL", name: "JSW Steel", yahoo: "JSWSTEEL.NS", nse: "JSWSTEEL" },
  { symbol: "TATASTEEL", name: "Tata Steel", yahoo: "TATASTEEL.NS", nse: "TATASTEEL" },
  { symbol: "NESTLEIND", name: "Nestle India", yahoo: "NESTLEIND.NS", nse: "NESTLEIND" },
] as const;

/** F&O underlyings for options chain (NSE). */
export const INDIA_FNO_UNDERLYINGS = [
  { symbol: "NIFTY", name: "Nifty 50", nse: "NIFTY", yahoo: "^NSEI" },
  { symbol: "BANKNIFTY", name: "Bank Nifty", nse: "BANKNIFTY", yahoo: "^NSEBANK" },
  { symbol: "FINNIFTY", name: "Fin Nifty", nse: "FINNIFTY", yahoo: "^CNXFIN" },
] as const;

export type IndiaStockConfig = (typeof NIFTY_50_STOCKS)[number];
