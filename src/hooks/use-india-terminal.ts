"use client";

import { useQuery } from "@tanstack/react-query";
import { getDemoOptionChain } from "@/data/india-demo";
import { enrichChainWithLiveLtp } from "@/services/india/india-index-ltp";
import { buildAccuracyScore, toTerminalSignal } from "@/engines/india-accuracy-engine";
import { analyzeOptionChainFull } from "@/engines/india-options-engine";
import { analyzeOiPositioning } from "@/engines/oi-engine";
import { detectMarketRegime } from "@/engines/regime-engine";
import { computeSectorScores } from "@/engines/sector-engine";
import { buildStockPick } from "@/engines/india-stock-timing-engine";
import { fetchIndiaCandles } from "@/services/india/india-candles";
import { fetchIndiaNews } from "@/services/india/india-news";
import { fetchIndiaStocks } from "@/services/india/india-markets";
import { fetchNseOptionChain } from "@/services/india/nse-india";
import { fetchFiiDii, getDemoFiiDii } from "@/services/india/nse-fii";
import { getNseMarketStatus } from "@/lib/nse-market-hours";
import { useIndiaSettingsStore } from "@/stores/india-settings-store";
import type { Timeframe } from "@/types";
import type { IndiaTerminalData, IndiaTerminalSignal } from "@/types/india-advanced";
import type { IndiaUnderlying } from "./use-india-options";

function buildCommentary(data: {
  regimeLabel: string;
  topSector?: string;
  fiiNet?: number;
  signalCount: number;
}): string {
  const parts = [
    `Market regime: ${data.regimeLabel}.`,
    data.topSector ? `Leading sector: ${data.topSector}.` : "",
    data.fiiNet !== undefined
      ? data.fiiNet >= 0
        ? `FII net buying ₹${Math.abs(data.fiiNet)} Cr — supportive.`
        : `FII net selling ₹${Math.abs(data.fiiNet)} Cr — caution.`
      : "",
    `${data.signalCount} high-conviction setups after multi-confirmation filter.`,
    "Educational model only — not financial advice.",
  ];
  return parts.filter(Boolean).join(" ");
}

export function useIndiaTerminal(timeframe?: Timeframe) {
  const demoMode = useIndiaSettingsStore((s) => s.demoMode);
  const minConfidence = useIndiaSettingsStore((s) => s.minConfidence);
  const defaultTf = useIndiaSettingsStore((s) => s.defaultTimeframe);
  const tf = timeframe ?? defaultTf;

  return useQuery({
    queryKey: ["india-terminal", tf, demoMode, minConfidence],
    queryFn: async (): Promise<IndiaTerminalData> => {
      const [stocks, news, fiiDiiRaw] = await Promise.all([
        fetchIndiaStocks(demoMode),
        fetchIndiaNews(demoMode),
        demoMode ? Promise.resolve(getDemoFiiDii()) : fetchFiiDii().then((r) => r ?? getDemoFiiDii()),
      ]);

      const sectors = computeSectorScores(stocks, news.headlines);
      const marketStatus = getNseMarketStatus();

      const nifty = stocks.find((s) => s.symbol === "NIFTY") ?? stocks.find((s) => s.segment === "index");
      let indexCandles = await fetchIndiaCandles(nifty?.symbol ?? "NIFTY", "1D", demoMode).catch(() => []);
      if (indexCandles.length < 30) {
        indexCandles = await fetchIndiaCandles("NIFTY", "1h", demoMode).catch(() => []);
      }

      let chain = demoMode ? getDemoOptionChain("NIFTY") : null;
      if (!chain && !demoMode) {
        try {
          chain = (await fetchNseOptionChain("NIFTY")) ?? getDemoOptionChain("NIFTY");
        } catch {
          chain = getDemoOptionChain("NIFTY");
        }
      }
      if (!chain) chain = getDemoOptionChain("NIFTY");
      const niftyLtp = await enrichChainWithLiveLtp(chain, "NIFTY");
      chain = { ...chain, spotPrice: niftyLtp.spotPrice };

      const oiInsight = analyzeOiPositioning(chain);
      const { regime, label: regimeLabel } = detectMarketRegime({
        indexCandles,
        news,
        pcr: chain.pcr,
      });

      const equities = stocks.filter((s) => s.segment === "equity");
      const signals: IndiaTerminalSignal[] = [];

      await Promise.all(
        equities.slice(0, 24).map(async (stock) => {
          try {
            const candles = await fetchIndiaCandles(stock.symbol, tf, demoMode);
            const pick = buildStockPick({ stock, candles, timeframe: tf, news, minConfidence });
            if (!pick || (pick.action !== "BUY" && pick.action !== "SELL")) return;
            const accuracy = buildAccuracyScore({
              pick,
              sectors,
              news,
              oiInsight,
              regime,
            });
            if (accuracy.confidence < minConfidence || accuracy.action === "WAIT") return;
            signals.push(toTerminalSignal(pick, accuracy, regime, oiInsight));
          } catch {
            /* skip */
          }
        })
      );

      signals.sort((a, b) => b.accuracy.confidence - a.accuracy.confidence);

      const underlyings: IndiaUnderlying[] = ["NIFTY", "BANKNIFTY", "FINNIFTY"];
      const optionsPlaybooks = [];
      for (const und of underlyings) {
        let c = demoMode ? getDemoOptionChain(und) : null;
        if (!c) {
          try {
            c = (await fetchNseOptionChain(und)) ?? getDemoOptionChain(und);
          } catch {
            c = getDemoOptionChain(und);
          }
        }
        const ltp = await enrichChainWithLiveLtp(c, und);
        c = { ...c, spotPrice: ltp.spotPrice };
        const pb = analyzeOptionChainFull(c, news, minConfidence);
        pb.spotPrice = ltp.spotPrice;
        pb.ltpSource = ltp.ltpSource;
        optionsPlaybooks.push(pb);
      }

      const buySignals = signals.filter((s) => s.accuracy.action.includes("BUY"));
      const sellSignals = signals.filter((s) => s.accuracy.action.includes("SELL"));

      return {
        marketStatus,
        regime,
        regimeLabel,
        news,
        sectors,
        fiiDii: fiiDiiRaw,
        signals,
        buySignals,
        sellSignals,
        optionsPlaybooks,
        commentary: buildCommentary({
          regimeLabel,
          topSector: sectors[0]?.name,
          fiiNet: fiiDiiRaw?.fiiNet,
          signalCount: signals.length,
        }),
      };
    },
    staleTime: 90_000,
    refetchInterval: 120_000,
  });
}
