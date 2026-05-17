import { INDIA_FNO_UNDERLYINGS, NIFTY_50_STOCKS } from "@/config/india-stocks";
import type { Candle } from "@/types";
import type { IndianStock, OptionChainSnapshot, OptionSignal } from "@/types/india";

export const DEMO_INDIA_STOCKS: IndianStock[] = NIFTY_50_STOCKS.map((s, i) => ({
  id: s.nse.toLowerCase(),
  symbol: s.symbol,
  name: s.name,
  yahooSymbol: s.yahoo,
  nseSymbol: s.nse,
  rank: i + 1,
  price: 500 + Math.random() * 3500,
  quoteCurrency: "INR" as const,
  change24h: (Math.random() - 0.5) * 4,
  volume24h: Math.random() * 1e7,
  segment: "equity" as const,
}));

export function getDemoIndiaCandles(symbol: string): Candle[] {
  const base = DEMO_INDIA_STOCKS.find((s) => s.symbol === symbol)?.price ?? 1000;
  const candles: Candle[] = [];
  let price = base;
  const now = Math.floor(Date.now() / 1000);
  for (let i = 200; i >= 0; i--) {
    const change = (Math.random() - 0.48) * 0.015;
    const open = price;
    price *= 1 + change;
    candles.push({
      time: now - i * 3600,
      open,
      high: Math.max(open, price) * 1.002,
      low: Math.min(open, price) * 0.998,
      close: price,
      volume: Math.random() * 1e6,
    });
  }
  return candles;
}

export function getDemoOptionChain(underlying: string): OptionChainSnapshot {
  const spot = underlying === "BANKNIFTY" ? 52000 : underlying === "FINNIFTY" ? 24000 : 24500;
  const step = underlying === "BANKNIFTY" ? 100 : 50;
  const strikes: OptionChainSnapshot["strikes"] = [];
  for (let i = -5; i <= 5; i++) {
    const strike = Math.round((spot + i * step) / step) * step;
    strikes.push({
      strike,
      callOi: Math.floor(Math.random() * 500000),
      putOi: Math.floor(Math.random() * 500000),
      callLtp: Math.max(10, Math.random() * 200),
      putLtp: Math.max(10, Math.random() * 200),
    });
  }
  const totalCall = strikes.reduce((s, r) => s + r.callOi, 0);
  const totalPut = strikes.reduce((s, r) => s + r.putOi, 0);
  return {
    underlying,
    spotPrice: spot,
    expiry: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    strikes,
    pcr: totalCall > 0 ? totalPut / totalCall : 1,
    timestamp: Date.now(),
  };
}

export const DEMO_OPTION_SIGNALS: OptionSignal[] = INDIA_FNO_UNDERLYINGS.map((u, i) => ({
  id: `demo-opt-${i}`,
  underlying: u.symbol,
  pairLabel: `${u.symbol} CE/INR`,
  optionType: "CE" as const,
  strike: u.symbol === "BANKNIFTY" ? 52000 : 24500,
  action: "BUY CALL" as const,
  side: "buy" as const,
  underlyingPrice: u.symbol === "BANKNIFTY" ? 52000 : 24500,
  premiumLtp: 145,
  riskPercent: 35,
  tradeDate: new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
  confidence: 72 + i * 3,
  premiumZone: [120, 180],
  targetPremium: 280,
  stopPremium: 80,
  riskReward: 2.1,
  expiry: getDemoOptionChain(u.symbol).expiry,
  entryTiming: "Demo: enter first hour or post-lunch consolidation",
  exitTiming: "Demo: book partial at 1.5R before expiry week",
  confirmations: ["PCR bullish", "OI buildup at ATM CE"],
  warnings: ["High theta decay near expiry"],
  timestamp: Date.now(),
}));
