/**
 * Quick diagnostic: how many coins produce tradeable vs WAIT signals.
 * Run: npx tsx scripts/debug-signals.ts
 */
import { resolveCryptoSignalFilters, isCryptoTradeEligible } from "../src/config/crypto-signal-filters";
import { HIGHER_TIMEFRAME } from "../src/engines/crypto-timing-engine";
import { filterSignals } from "../src/engines/risk-engine";
import { computeIndicators } from "../src/engines/indicators";
import { generateSignal } from "../src/engines/signal-engine";
import {
  applyWarningPenalty,
  buildSmartWarnings,
  computeConfidence,
} from "../src/engines/trade-quality-engine";
import { fetchCandles } from "../src/services/candles";

const SYMBOLS = ["BTC", "ETH", "SOL", "XRP", "DOGE", "BNB", "ADA", "AVAX"];
const TF = "5m" as const;

async function main() {
  for (const relaxed of [false, true]) {
    const filters = resolveCryptoSignalFilters(55, relaxed);
    console.log(`\n=== relaxed=${relaxed} filters`, filters, "===\n");
    let withSignal = 0;
    let tradeEligible = 0;
    let passedFilter = 0;
    const rows: string[] = [];

    for (const symbol of SYMBOLS) {
      try {
        const candles = await fetchCandles(symbol, TF, 200, false);
        const htf = HIGHER_TIMEFRAME[TF];
        const htfCandles =
          htf !== TF ? await fetchCandles(symbol, htf, 100, false).catch(() => undefined) : undefined;
        const s = generateSignal({
          symbol,
          coinId: symbol.toLowerCase(),
          candles,
          higherTimeframeCandles: htfCandles,
          timeframe: TF,
          market: "spot",
          ...filters,
          minConfidence: filters.minConfidence,
          includeWeak: true,
          relaxed,
        });
        if (!s) {
          rows.push(`${symbol}: null`);
          continue;
        }
        const ind = computeIndicators(candles);
        const price = candles[candles.length - 1].close;
        const warnings = buildSmartWarnings({
          isBullish: s.bullishScore > s.bearishScore,
          price,
          indicators: ind,
          chartTrend: "Sideways",
          higherTfTrend: "Sideways",
          highestTfTrend: "Sideways",
          regime: s.regime ?? "ranging",
          nearestSupport: price * 0.98,
          nearestResistance: price * 1.02,
          candles,
          riskReward: s.riskReward,
          isFutures: false,
        });
        const rawConf = computeConfidence({
          isBullish: s.bullishScore > s.bearishScore,
          price,
          indicators: ind,
          chartTrend: "Sideways",
          higherTfTrend: "Sideways",
          highestTfTrend: "Sideways",
          regime: s.regime ?? "ranging",
          nearestSupport: price * 0.98,
          nearestResistance: price * 1.02,
          candles,
          riskReward: s.riskReward,
          isFutures: false,
        });
        const afterPenalty = applyWarningPenalty(rawConf.confidence, warnings);
        withSignal++;
        const elig = isCryptoTradeEligible(s, filters);
        if (elig) tradeEligible++;
        const filtered = filterSignals([s], 55, { relaxed })[0];
        if (filtered) passedFilter++;
        rows.push(
          `${symbol}: action=${s.action} conf=${s.confidence} raw=${rawConf.confidence} afterPen=${afterPenalty} warns=${warnings.length} confs=${s.confirmations.length} rr=${s.riskReward} tq=${s.tradeQuality} cap=${s.capitalPreservationMode} elig=${elig} filtered=${!!filtered}`
        );
      } catch (e) {
        rows.push(`${symbol}: ERROR ${e instanceof Error ? e.message : e}`);
      }
    }
    rows.forEach((r) => console.log(r));
    console.log(
      `Summary: signals=${withSignal} tradeEligible=${tradeEligible} passedFilter=${passedFilter}/${SYMBOLS.length}`
    );
  }
}

main().catch(console.error);
