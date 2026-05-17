import { getSectorForSymbol } from "@/config/india-sectors";
import { getSectorAlignmentBonus } from "@/engines/sector-engine";
import type { IndiaFnoMetrics, IndiaNewsSentiment, IndiaStockPick } from "@/types/india";
import type { IndiaAccuracyScore, MarketRegime, OiInsight, SectorScore } from "@/types/india-advanced";

export function buildAccuracyScore(params: {
  pick: IndiaStockPick;
  sectors: SectorScore[];
  news: IndiaNewsSentiment;
  fno?: IndiaFnoMetrics | null;
  oiInsight?: OiInsight;
  regime: MarketRegime;
}): IndiaAccuracyScore {
  const { pick, sectors, news, fno, oiInsight, regime } = params;
  const sectorAlign = getSectorAlignmentBonus(pick.symbol, sectors);

  let bullish = pick.action === "BUY" ? pick.confidence : 0;
  let bearish = pick.action === "SELL" ? pick.confidence : 0;
  if (pick.action === "BUY") bullish = pick.confidence;
  if (pick.action === "SELL") bearish = pick.confidence;

  const technical =
    (pick.indicators?.trendStrength ?? 50) * 0.4 +
    (pick.indicators?.emaTrend === "bullish" ? 20 : pick.indicators?.emaTrend === "bearish" ? -20 : 0);

  const newsAlignment =
    (pick.newsBias ?? 0) * 50 + (news.overall > 0 ? news.overall * 20 : news.overall * 20);

  let oiConfirmation = 0;
  if (fno) {
    if (pick.action === "BUY" && fno.trendBias === "bullish") oiConfirmation += 15;
    if (pick.action === "SELL" && fno.trendBias === "bearish") oiConfirmation += 15;
    if (fno.pcr > 1.1 && pick.action === "BUY") oiConfirmation += 8;
    if (fno.pcr < 0.9 && pick.action === "SELL") oiConfirmation += 8;
  }
  if (oiInsight) {
    if (oiInsight.type === "long_buildup" && pick.action === "BUY") oiConfirmation += oiInsight.confidence * 0.2;
    if (oiInsight.type === "short_buildup" && pick.action === "SELL") oiConfirmation += oiInsight.confidence * 0.2;
  }

  const institutional = fno ? Math.min(100, (fno.totalCallOi + fno.totalPutOi) / 1e6) : 40;

  let risk = pick.riskPercent ?? 2;
  if (regime === "panic" || regime === "high_volatility") risk += 25;
  if (regime === "sideways" && pick.holdDuration === "intraday") risk += 15;
  risk = Math.min(100, risk);

  const sectorBonus = sectorAlign.bonus;
  if (pick.action === "BUY") bullish += sectorBonus + newsAlignment * 0.3 + oiConfirmation;
  if (pick.action === "SELL") bearish += Math.abs(sectorBonus) + Math.abs(newsAlignment) * 0.3 + oiConfirmation;

  const confirmations: string[] = [...(pick.indicators?.readings.slice(0, 2) ?? [])];
  if (sectorAlign.bonus > 5) confirmations.push(sectorAlign.note);
  if (Math.abs(pick.newsBias ?? 0) > 0.15) confirmations.push(pick.technicalSummary?.slice(0, 80) ?? "News aligned");
  if (oiInsight && oiInsight.confidence > 50) confirmations.push(oiInsight.label);
  if (fno?.trendBias === "bullish" && pick.action === "BUY") confirmations.push("F&O trend bullish");
  if (fno?.trendBias === "bearish" && pick.action === "SELL") confirmations.push("F&O trend bearish");

  const warnings: string[] = [];
  if (regime === "bull_trap" && pick.action === "BUY") warnings.push("Bull trap regime — wait for confirmation");
  if (regime === "bear_trap" && pick.action === "SELL") warnings.push("Bear trap risk — avoid aggressive shorts");
  if (regime === "panic") warnings.push("Panic regime — reduce size, preserve capital");
  if ((pick.riskPercent ?? 0) > 3) warnings.push(`Elevated risk ~${pick.riskPercent}% to stop`);
  if (sectorAlign.bonus < -5 && pick.action === "BUY") warnings.push("Sector headwind — lower conviction");

  const total = bullish + bearish + 1;
  let confidence = (Math.max(bullish, bearish) / total) * 100;
  confidence = Math.min(95, Math.max(0, confidence));

  const probability = Math.round(confidence * 0.85);

  let action: IndiaAccuracyScore["action"] = "HOLD";
  if (confidence >= 82 && pick.action === "BUY") action = "STRONG BUY";
  else if (confidence >= 68 && pick.action === "BUY") action = "BUY";
  else if (confidence >= 82 && pick.action === "SELL") action = "STRONG SELL";
  else if (confidence >= 68 && pick.action === "SELL") action = "SELL";
  else if (pick.action === "WAIT" || confidence < 55) action = "WAIT";
  else action = "HOLD";

  if (warnings.length >= 2 && (action === "STRONG BUY" || action === "STRONG SELL")) {
    action = action.includes("BUY") ? "BUY" : "SELL";
    confidence -= 8;
  }

  return {
    bullish: Math.round(bullish),
    bearish: Math.round(bearish),
    confidence: Math.round(confidence),
    risk: Math.round(risk),
    institutional: Math.round(institutional),
    sectorAlignment: Math.round(50 + sectorAlign.bonus),
    newsAlignment: Math.round(50 + newsAlignment),
    technical: Math.round(50 + technical * 0.5),
    oiConfirmation: Math.round(oiConfirmation),
    action,
    probability,
    confirmations: confirmations.slice(0, 6),
    warnings,
  };
}

export function toTerminalSignal(
  pick: IndiaStockPick,
  accuracy: IndiaAccuracyScore,
  regime: MarketRegime,
  oiInsight?: OiInsight
) {
  const sector = getSectorForSymbol(pick.symbol);
  return {
    ...pick,
    accuracy,
    sector,
    sectorName: sector.replace(/_/g, " "),
    oiInsight,
    regime,
  };
}
