export const API_PROVIDERS = {
  coingecko: {
    name: "CoinGecko",
    baseUrl: "https://api.coingecko.com/api/v3",
    rateLimit: 30,
  },
  binance: {
    name: "Binance",
    baseUrl: "https://api.binance.com/api/v3",
    futuresUrl: "https://fapi.binance.com/fapi/v1",
    rateLimit: 1200,
  },
  bybit: {
    name: "Bybit",
    baseUrl: "https://api.bybit.com/v5",
    rateLimit: 120,
  },
  coincap: {
    name: "CoinCap",
    baseUrl: "https://api.coincap.io/v2",
    rateLimit: 200,
  },
  coinpaprika: {
    name: "CoinPaprika",
    baseUrl: "https://api.coinpaprika.com/v1",
    rateLimit: 100,
  },
  coinlore: {
    name: "CoinLore",
    baseUrl: "https://api.coinlore.net/api",
    rateLimit: 100,
  },
  cryptocompare: {
    name: "CryptoCompare",
    baseUrl: "https://min-api.cryptocompare.com/data",
    rateLimit: 100,
  },
  fearGreed: {
    name: "Fear & Greed",
    baseUrl: "https://api.alternative.me/fng",
    rateLimit: 60,
  },
  cryptopanic: {
    name: "CryptoPanic",
    baseUrl: "https://cryptopanic.com/api/v1",
    rateLimit: 30,
  },
  dexscreener: {
    name: "DexScreener",
    baseUrl: "https://api.dexscreener.com/latest",
    rateLimit: 300,
  },
  yahooFinance: {
    name: "Yahoo Finance",
    baseUrl: "https://query1.finance.yahoo.com",
    rateLimit: 100,
  },
  nseIndia: {
    name: "NSE India",
    baseUrl: "https://www.nseindia.com/api",
    rateLimit: 30,
  },
  bseIndia: {
    name: "BSE India",
    baseUrl: "https://api.bseindia.com",
    rateLimit: 60,
  },
} as const;

export const BINANCE_INTERVALS: Record<string, string> = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "1h": "1h",
  "4h": "4h",
  "1D": "1d",
  "1W": "1w",
};

/** Minimum bars for indicators (engine needs 50). */
export const CANDLE_LIMIT_PRIMARY = 120;
export const CANDLE_LIMIT_HTF = 80;

export const CACHE_TTL = {
  markets: 60_000,
  candles: 90_000,
  fearGreed: 300_000,
  news: 120_000,
  futures: 45_000,
  dominance: 120_000,
  indiaMarkets: 60_000,
  indiaCandles: 45_000,
  indiaOptions: 90_000,
} as const;

export const MIN_CONFIDENCE_DEFAULT = 55;

export const DISCLAIMER =
  "This tool is for educational purposes only and not financial advice. Cryptocurrency trading involves substantial risk. Past signals do not guarantee future results.";
