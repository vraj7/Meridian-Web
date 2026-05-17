import { DELTA_FUTURES_ASSETS } from "@/config/delta-exchange-futures";
import { QUOTE_CURRENCY } from "@/config/market";
import type { Candle, CoinMarket, FuturesMetrics, SentimentData } from "@/types";

const DEMO_PRICES: Record<string, number> = {
  BTC: 97500,
  ETH: 3650,
  SOL: 185,
  XRP: 2.45,
  BNB: 685,
  ADA: 0.72,
  DOGE: 0.18,
  AVAX: 28,
  LINK: 14,
  DOT: 6.5,
  TRX: 0.22,
  LTC: 98,
  UNI: 9.5,
  XLM: 0.38,
  XMR: 165,
  SUI: 3.2,
  APT: 8.5,
  ARB: 0.75,
  OP: 1.6,
  INJ: 22,
  FIL: 4.2,
  HBAR: 0.22,
  MANA: 0.38,
  IOTA: 0.22,
  ZEC: 42,
  DASH: 28,
  WLD: 2.1,
  SEI: 0.35,
  STRK: 0.55,
  AAVE: 185,
  GALA: 0.04,
  BCH: 420,
  BLUR: 0.35,
  TIA: 6.5,
  DOGS: 0.00012,
  WIF: 2.5,
  DYDX: 1.2,
  ENA: 0.55,
  JTO: 2.8,
  JUP: 0.85,
  KSM: 28,
  LDO: 1.4,
  MANTA: 0.9,
  MEME: 0.012,
  NOT: 0.006,
  ONDO: 0.95,
  ORDI: 35,
  PENDLE: 4.5,
  POL: 0.42,
  STX: 1.1,
  RUNE: 4.2,
  TON: 5.5,
  AXS: 6.5,
  "1000SATS": 0.00035,
};

function demoMarketRow(
  coin: { id: string; symbol: string; name: string; price: number },
  rank: number
): CoinMarket {
  const seed = rank * 17;
  return {
    id: coin.id,
    symbol: coin.symbol,
    name: coin.name,
    image: "",
    rank,
    price: coin.price,
    change24h: ((seed % 20) - 10) / 10,
    marketCap: 1e9 * Math.max(1, 60 - rank),
    volume24h: 1e8 * (1 + (seed % 50) / 10),
    quoteCurrency: QUOTE_CURRENCY,
  };
}

export const DEMO_MARKETS: CoinMarket[] = DELTA_FUTURES_ASSETS.map((a, i) =>
  demoMarketRow(
    {
      id: a.coingeckoId,
      symbol: a.symbol,
      name: a.name,
      price: DEMO_PRICES[a.symbol] ?? 5 + i * 0.5,
    },
    i + 1
  )
);

function generateCandles(basePrice: number, count = 200): Candle[] {
  const candles: Candle[] = [];
  let price = basePrice;
  const now = Math.floor(Date.now() / 1000);
  const interval = 3600;

  for (let i = count; i >= 0; i--) {
    const change = (Math.random() - 0.48) * 0.02;
    const open = price;
    price = price * (1 + change);
    const high = Math.max(open, price) * (1 + Math.random() * 0.005);
    const low = Math.min(open, price) * (1 - Math.random() * 0.005);
    candles.push({
      time: now - i * interval,
      open,
      high,
      low,
      close: price,
      volume: Math.random() * 1e6,
    });
  }
  return candles;
}

export function getDemoCandles(symbol: string): Candle[] {
  const base = DEMO_MARKETS.find((c) => c.symbol === symbol)?.price ?? 100;
  return generateCandles(base);
}

function demoSeed(symbol: string): number {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function getDemoFutures(symbol: string): FuturesMetrics {
  const h = demoSeed(symbol);
  const unit = (n: number) => (h % n) / n;
  const fundingRate = (unit(100) - 0.5) * 0.02;
  const longShortRatio = 0.7 + unit(50) * 0.8;
  let squeezeRisk: FuturesMetrics["squeezeRisk"] = "none";
  if (fundingRate < -0.005 && longShortRatio > 1.5) squeezeRisk = "short";
  if (fundingRate > 0.005 && longShortRatio < 0.7) squeezeRisk = "long";

  return {
    symbol,
    fundingRate,
    openInterest: 5e8 + unit(20) * 5e8,
    longShortRatio,
    liquidationLongZone: undefined,
    liquidationShortZone: undefined,
    squeezeRisk,
    volatilityAlert: Math.abs(fundingRate) > 0.012,
  };
}

export const DEMO_SENTIMENT: SentimentData = {
  fearGreed: 62,
  fearGreedLabel: "Greed",
  newsScore: 0.15,
  socialScore: 0.22,
  overall: 0.18,
  headlines: [
    {
      id: "1",
      title: "Bitcoin holds above key support as ETF inflows steady",
      source: "Demo Feed",
      url: "#",
      sentiment: "bullish",
      score: 0.6,
      coins: ["BTC"],
      publishedAt: Date.now() - 3600000,
    },
    {
      id: "2",
      title: "Ethereum network activity rises ahead of upgrade narrative",
      source: "Demo Feed",
      url: "#",
      sentiment: "bullish",
      score: 0.45,
      coins: ["ETH"],
      publishedAt: Date.now() - 7200000,
    },
  ],
};

export const DEMO_COINS = DELTA_FUTURES_ASSETS.map((a) => a.coingeckoId);
