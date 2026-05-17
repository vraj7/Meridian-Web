import { format } from "date-fns";
import { formatIndiaPairLabel } from "@/config/market";
import { computeIndicators } from "@/engines/indicators";
import {
  addTradingSessions,
  formatPickDate,
  getISTNow,
  getNseMarketStatus,
  getNextTradingSession,
} from "@/lib/nse-market-hours";
import { formatInr, generateId } from "@/lib/utils";
import { getSymbolNewsBias } from "@/services/india/india-news";
import type { Candle, Timeframe } from "@/types";
import type { IndianStock, IndiaIndicatorSnapshot, IndiaNewsSentiment, IndiaStockPick } from "@/types/india";

function buildIndicatorSnapshot(
  indicators: ReturnType<typeof computeIndicators>,
  price: number
): IndiaIndicatorSnapshot {
  const readings: string[] = [];

  if (indicators.rsi < 30) readings.push(`RSI ${indicators.rsi.toFixed(0)} oversold — bounce potential`);
  else if (indicators.rsi > 70) readings.push(`RSI ${indicators.rsi.toFixed(0)} overbought — pullback risk`);
  else readings.push(`RSI ${indicators.rsi.toFixed(0)} neutral zone`);

  if (indicators.macd.histogram > 0 && indicators.macd.macd > indicators.macd.signal) {
    readings.push("MACD bullish — momentum rising");
  } else if (indicators.macd.histogram < 0) {
    readings.push("MACD bearish — momentum fading");
  } else {
    readings.push("MACD mixed");
  }

  let emaTrend: IndiaIndicatorSnapshot["emaTrend"] = "neutral";
  if (indicators.ema9 > indicators.ema21 && indicators.ema21 > indicators.ema50) {
    emaTrend = "bullish";
    readings.push("EMA 9>21>50 — uptrend structure");
  } else if (indicators.ema9 < indicators.ema21 && indicators.ema21 < indicators.ema50) {
    emaTrend = "bearish";
    readings.push("EMA 9<21<50 — downtrend structure");
  } else {
    readings.push("EMA alignment mixed");
  }

  const priceVsVwap = price >= indicators.vwap ? "above" : "below";
  readings.push(
    priceVsVwap === "above"
      ? `Price above VWAP (${indicators.vwap.toFixed(0)}) — buyers in control`
      : `Price below VWAP (${indicators.vwap.toFixed(0)}) — weak intraday`
  );

  if (indicators.stochRsi < 20) readings.push("Stoch RSI oversold");
  if (indicators.stochRsi > 80) readings.push("Stoch RSI overbought");

  return {
    rsi: indicators.rsi,
    macdHistogram: indicators.macd.histogram,
    emaTrend,
    priceVsVwap,
    trendStrength: indicators.trendStrength,
    readings,
  };
}

function sessionsForTimeframe(tf: Timeframe): { entry: number; exit: number } {
  if (tf === "1m" || tf === "5m" || tf === "15m") return { entry: 0, exit: 0 };
  if (tf === "1h" || tf === "4h") return { entry: 1, exit: 3 };
  if (tf === "1D") return { entry: 1, exit: 5 };
  return { entry: 2, exit: 10 };
}

export function buildStockPick(params: {
  stock: IndianStock;
  candles: Candle[];
  timeframe: Timeframe;
  news: IndiaNewsSentiment;
  minConfidence: number;
}): IndiaStockPick | null {
  const { stock, candles, timeframe, news, minConfidence } = params;
  if (candles.length < 50) return null;

  const market = getNseMarketStatus();
  const indicators = computeIndicators(candles);
  const price = stock.price > 0 ? stock.price : candles[candles.length - 1].close;
  const change24h = stock.change24h;
  const indicatorSnap = buildIndicatorSnapshot(indicators, price);
  const { score: newsBias, headlines, note } = getSymbolNewsBias(stock.symbol, news);

  let bullish = 0;
  let bearish = 0;

  if (indicators.rsi < 35) bullish += 15;
  if (indicators.rsi > 65) bearish += 15;
  if (indicators.ema9 > indicators.ema21) bullish += 12;
  else bearish += 12;
  if (indicators.macd.histogram > 0) bullish += 10;
  else bearish += 10;
  if (price > indicators.vwap) bullish += 8;
  else bearish += 8;
  if (indicators.trend === "bullish") bullish += indicatorSnap.trendStrength * 0.15;
  if (indicators.trend === "bearish") bearish += indicatorSnap.trendStrength * 0.15;
  if (newsBias > 0.15) bullish += 15;
  if (newsBias < -0.15) bearish += 15;
  if (news.globalNewsScore < -0.2) bearish += 8;
  if (news.globalNewsScore > 0.2) bullish += 8;

  const total = bullish + bearish;
  const confidence = total > 0 ? (Math.max(bullish, bearish) / total) * 100 : 0;
  if (confidence < minConfidence) return null;

  const isBuy = bullish > bearish;
  const atr = indicators.atr || price * 0.02;

  let action: IndiaStockPick["action"] = isBuy ? "BUY" : "SELL";
  if (Math.abs(bullish - bearish) < total * 0.15) action = "HOLD";
  if (confidence < minConfidence + 5 && action !== "HOLD") action = "WAIT";

  const buyZone: [number, number] = [price - atr * 0.4, price + atr * 0.15];
  const sellZone: [number, number] = [price + atr * 0.5, price + atr * 2.5];
  const stopLoss = isBuy ? price - atr * 1.5 : price + atr * 1.5;
  const targetPrice = isBuy ? price + atr * 2.5 : price - atr * 2.5;

  const entryPrice = isBuy ? (buyZone[0] + buyZone[1]) / 2 : price;
  const riskPercent = Math.round((Math.abs(entryPrice - stopLoss) / entryPrice) * 1000) / 10;
  const suggestedRiskPerTrade =
    riskPercent > 3 ? 0.5 : riskPercent > 2 ? 1 : confidence >= 80 ? 1.5 : 1;

  const { entry: entrySessions, exit: exitSessions } = sessionsForTimeframe(timeframe);
  const ist = getISTNow();
  let buySession = market.isOpen ? ist : getNextTradingSession(ist);
  if (!market.isOpen && entrySessions > 0) {
    buySession = addTradingSessions(buySession, entrySessions);
  } else if (market.isOpen && entrySessions > 0) {
    buySession = addTradingSessions(ist, entrySessions);
  }

  const sellSession = addTradingSessions(buySession, Math.max(exitSessions, 1));
  const buyDate = formatPickDate(buySession);
  const sellDate = formatPickDate(sellSession);

  const tfLabel =
    timeframe === "1D" || timeframe === "1W"
      ? "swing"
      : timeframe === "1h" || timeframe === "4h"
        ? "positional"
        : "intraday";

  const marketNote = market.isOpen
    ? `Live session ${market.istTimeFormatted} IST`
    : `${market.label} — plan for ${market.nextSessionLabel}`;

  const globalImpact =
    news.globalNewsScore > 0.15
      ? "Supportive global cues — FII flows / risk-on"
      : news.globalNewsScore < -0.15
        ? "Headwind from global macro — oil, rates, or geopolitics"
        : "Mixed global backdrop — stock-specific action";

  return {
    id: generateId(),
    symbol: stock.symbol,
    name: stock.name,
    pairLabel: formatIndiaPairLabel(stock.symbol),
    action,
    confidence: Math.round(confidence),
    currentPrice: price,
    change24h,
    buyZone: isBuy ? buyZone : undefined,
    sellZone: !isBuy ? [price - atr * 2, price - atr * 0.3] : sellZone,
    stopLoss,
    targetPrice,
    riskPercent,
    suggestedRiskPerTrade,
    buyDate,
    sellDate,
    buyTiming:
      action === "BUY"
        ? `${buyDate} · ${marketNote} · Enter ${tfLabel} near ${formatInrZone(buyZone)} between 10:15–11:30 or 14:00–15:00 IST`
        : action === "HOLD"
          ? `Hold — reassess on ${format(addTradingSessions(ist, 1), "EEE d MMM")}`
          : "Avoid new longs",
    sellTiming:
      action === "SELL"
        ? `${sellDate} · Exit / reduce exposure · Target zone ${formatInrZone([targetPrice, price])}`
        : action === "BUY"
          ? `${sellDate} · Book partial at ${formatInr(sellZone[0])}; trail SL or exit at target`
          : `Review on ${sellDate} if daily close breaks stop`,
    holdDuration: tfLabel,
    indicators: indicatorSnap,
    marketWasOpen: market.isOpen,
    newsBias,
    newsHeadlines: headlines.map((h) => h.title).slice(0, 3),
    globalImpact,
    technicalSummary: `${indicatorSnap.readings.slice(0, 3).join(". ")}. ${note}`,
    timestamp: Date.now(),
  };
}

function formatInrZone(z: [number, number]): string {
  return `₹${z[0].toFixed(0)}–₹${z[1].toFixed(0)}`;
}
