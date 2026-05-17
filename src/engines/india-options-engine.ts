import { formatIndiaPairLabel } from "@/config/market";
import { formatPickDate, getNseMarketStatus, getNextTradingSession } from "@/lib/nse-market-hours";
import { generateId } from "@/lib/utils";
import type {
  IndiaFnoMetrics,
  IndiaNewsSentiment,
  IndiaOptionsPlaybook,
  OptionChainSnapshot,
  OptionSignal,
  OptionTradeAction,
} from "@/types/india";

function mkOptionSignal(params: {
  underlying: string;
  optionType: "CE" | "PE";
  strike: number;
  action: OptionTradeAction;
  side: "buy" | "sell";
  confidence: number;
  ltp: number;
  expiry: string;
  confirmations: string[];
  warnings: string[];
  newsImpact?: string;
  underlyingPrice: number;
}): OptionSignal {
  const {
    underlying,
    optionType,
    strike,
    action,
    side,
    confidence,
    ltp,
    expiry,
    confirmations,
    warnings,
    newsImpact,
    underlyingPrice,
  } = params;
  const base = Math.max(ltp, 10);
  const isBuy = side === "buy";
  const stop = isBuy ? base * 0.6 : base * 1.4;
  const riskPercent = Math.round((Math.abs(base - stop) / base) * 1000) / 10;
  const market = getNseMarketStatus();
  const tradeSession = market.isOpen ? market.istNow : getNextTradingSession();
  const tradeDate = formatPickDate(tradeSession);

  return {
    id: generateId(),
    underlying,
    pairLabel: `${formatIndiaPairLabel(underlying)} ${optionType}`,
    optionType,
    strike,
    action,
    side,
    confidence: Math.round(confidence),
    underlyingPrice,
    premiumLtp: Math.round(base * 100) / 100,
    riskPercent,
    tradeDate,
    premiumZone: isBuy ? [base * 0.95, base * 1.1] : [base * 1.05, base * 1.2],
    targetPremium: isBuy ? base * 1.75 : base * 0.45,
    stopPremium: isBuy ? base * 0.6 : base * 1.4,
    riskReward: isBuy ? 2 : 1.8,
    expiry,
    entryTiming: isBuy
      ? `${tradeDate}${market.isOpen ? "" : " (next session)"} · ${market.label} · Enter on pullback in premium zone`
      : `${tradeDate} · Enter on IV/premium expansion`,
    exitTiming: isBuy
      ? `Risk ~${riskPercent}% on premium · Book 50% at 1.5R; exit before expiry week close`
      : `Risk ~${riskPercent}% · Cover at 50–70% decay or stop`,
    confirmations,
    warnings,
    newsImpact,
    timestamp: Date.now(),
  };
}

export function analyzeOptionChainFull(
  chain: OptionChainSnapshot,
  news?: IndiaNewsSentiment,
  minConfidence = 65
): IndiaOptionsPlaybook {
  const { underlying, spotPrice, strikes, pcr, expiry } = chain;

  let maxPainStrike = strikes[0]?.strike ?? spotPrice;
  let minPain = Infinity;
  strikes.forEach((row) => {
    let pain = 0;
    strikes.forEach((r) => {
      if (r.strike < row.strike) pain += (row.strike - r.strike) * r.callOi;
      if (r.strike > row.strike) pain += (r.strike - row.strike) * r.putOi;
    });
    if (pain < minPain) {
      minPain = pain;
      maxPainStrike = row.strike;
    }
  });

  const atm = strikes.reduce(
    (best, r) => (Math.abs(r.strike - spotPrice) < Math.abs(best.strike - spotPrice) ? r : best),
    strikes[0]
  );
  const otmCall = strikes.find((r) => r.strike > spotPrice && r.strike <= spotPrice * 1.02) ?? atm;
  const otmPut = strikes.find((r) => r.strike < spotPrice && r.strike >= spotPrice * 0.98) ?? atm;

  let trendBias: IndiaFnoMetrics["trendBias"] = "neutral";
  if (pcr > 1.08) trendBias = "bullish";
  if (pcr < 0.92) trendBias = "bearish";

  const newsMod = news ? news.overall * 12 : 0;
  const baseConf = 52 + Math.min(28, Math.abs(pcr - 1) * 45) + newsMod;

  const metrics: IndiaFnoMetrics = {
    symbol: underlying,
    underlyingPrice: spotPrice,
    pcr,
    totalCallOi: strikes.reduce((s, r) => s + r.callOi, 0),
    totalPutOi: strikes.reduce((s, r) => s + r.putOi, 0),
    maxPainStrike,
    ivSkew:
      (atm?.callIv ?? 0) > (atm?.putIv ?? 0) + 2 ? "call" : (atm?.putIv ?? 0) > (atm?.callIv ?? 0) + 2 ? "put" : "neutral",
    trendBias,
    volatilityAlert: (atm?.callIv ?? 0) > 22 || (atm?.putIv ?? 0) > 22,
  };

  const buyCall: OptionSignal[] = [];
  const sellCall: OptionSignal[] = [];
  const buyPut: OptionSignal[] = [];
  const sellPut: OptionSignal[] = [];

  const newsNote = news
    ? `News mood: ${news.marketMood} (India ${(news.indiaNewsScore * 100).toFixed(0)}, Global ${(news.globalNewsScore * 100).toFixed(0)})`
    : undefined;

  if (baseConf >= minConfidence && (trendBias === "bullish" || (news?.overall ?? 0) > 0.1)) {
    if (spotPrice <= maxPainStrike * 1.01) {
      buyCall.push(
        mkOptionSignal({
          underlying,
          optionType: "CE",
          strike: atm.strike,
          action: "BUY CALL",
          side: "buy",
          confidence: baseConf + (trendBias === "bullish" ? 8 : 0),
          ltp: atm.callLtp ?? 80,
          expiry,
          confirmations: [
            `PCR ${pcr.toFixed(2)} bullish`,
            `Spot ${spotPrice} at/below max pain ${maxPainStrike}`,
            "OI supports upside bias",
          ],
          warnings: metrics.volatilityAlert ? ["High IV — prefer defined risk"] : [],
          newsImpact: newsNote,
          underlyingPrice: spotPrice,
        })
      );
    }
    if (metrics.ivSkew === "call" && otmCall) {
      sellCall.push(
        mkOptionSignal({
          underlying,
          optionType: "CE",
          strike: otmCall.strike,
          action: "SELL CALL",
          side: "sell",
          confidence: Math.min(88, baseConf - 5),
          ltp: otmCall.callLtp ?? 60,
          expiry,
          confirmations: ["Elevated call IV skew — premium selling favored", `Resistance near ${otmCall.strike}`],
          warnings: ["Unlimited risk on naked CE — use spreads in live trading"],
          newsImpact: newsNote,
          underlyingPrice: spotPrice,
        })
      );
    }
  }

  if (baseConf >= minConfidence && (trendBias === "bearish" || (news?.overall ?? 0) < -0.1)) {
    if (spotPrice >= maxPainStrike * 0.99) {
      buyPut.push(
        mkOptionSignal({
          underlying,
          optionType: "PE",
          strike: atm.strike,
          action: "BUY PUT",
          side: "buy",
          confidence: baseConf + (trendBias === "bearish" ? 8 : 0),
          ltp: atm.putLtp ?? 80,
          expiry,
          confirmations: [
            `PCR ${pcr.toFixed(2)} bearish`,
            `Spot ${spotPrice} at/above max pain ${maxPainStrike}`,
            "Hedging / downside OI rising",
          ],
          warnings: metrics.volatilityAlert ? ["Event risk — size down"] : [],
          newsImpact: newsNote,
          underlyingPrice: spotPrice,
        })
      );
    }
    if (metrics.ivSkew === "put" && otmPut) {
      sellPut.push(
        mkOptionSignal({
          underlying,
          optionType: "PE",
          strike: otmPut.strike,
          action: "SELL PUT",
          side: "sell",
          confidence: Math.min(88, baseConf - 5),
          ltp: otmPut.putLtp ?? 60,
          expiry,
          confirmations: ["Elevated put IV — sell premium if support holds", `Support near ${otmPut.strike}`],
          warnings: ["Tail risk on naked PE — hedge or use spreads"],
          newsImpact: newsNote,
          underlyingPrice: spotPrice,
        })
      );
    }
  }

  if (pcr > 1.2 && baseConf >= minConfidence - 5) {
    sellPut.push(
      mkOptionSignal({
        underlying,
        optionType: "PE",
        strike: otmPut?.strike ?? atm.strike,
        action: "SELL PUT",
        side: "sell",
        confidence: baseConf,
        ltp: otmPut?.putLtp ?? 50,
        expiry,
        confirmations: ["High PCR — put writers active", "Bullish institutional positioning"],
        warnings: ["Avoid if global risk-off headlines dominate"],
        newsImpact: newsNote,
        underlyingPrice: spotPrice,
      })
    );
  }

  if (pcr < 0.8 && baseConf >= minConfidence - 5) {
    sellCall.push(
      mkOptionSignal({
        underlying,
        optionType: "CE",
        strike: otmCall?.strike ?? atm.strike,
        action: "SELL CALL",
        side: "sell",
        confidence: baseConf,
        ltp: otmCall?.callLtp ?? 50,
        expiry,
        confirmations: ["Low PCR — call writing dominant", "Capped upside expectation"],
        warnings: ["Sharp rally can cause losses"],
        newsImpact: newsNote,
        underlyingPrice: spotPrice,
      })
    );
  }

  const parts = [
    `${underlying} spot ${spotPrice}, PCR ${pcr.toFixed(2)}, max pain ${maxPainStrike}.`,
    news ? `Macro mood: ${news.marketMood}. ${news.warnings[0] ?? ""}` : "",
    `Calls: ${buyCall.length} buy / ${sellCall.length} sell. Puts: ${buyPut.length} buy / ${sellPut.length} sell.`,
    "Educational F&O analysis — not SEBI-registered advice.",
  ];

  return {
    underlying,
    spotPrice,
    expiry,
    buyCall,
    sellCall,
    buyPut,
    sellPut,
    metrics,
    marketCommentary: parts.filter(Boolean).join(" "),
  };
}

/** @deprecated use analyzeOptionChainFull */
export function analyzeOptionChain(
  chain: OptionChainSnapshot,
  minConfidence = 65
): { metrics: IndiaFnoMetrics; signals: OptionSignal[] } {
  const pb = analyzeOptionChainFull(chain, undefined, minConfidence);
  return {
    metrics: pb.metrics,
    signals: [...pb.buyCall, ...pb.sellCall, ...pb.buyPut, ...pb.sellPut],
  };
}
