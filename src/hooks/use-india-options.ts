"use client";

import { useQuery } from "@tanstack/react-query";
import { analyzeOptionChainFull } from "@/engines/india-options-engine";
import { getDemoOptionChain } from "@/data/india-demo";
import { enrichChainWithLiveLtp } from "@/services/india/india-index-ltp";
import { fetchNseOptionChain } from "@/services/india/nse-india";
import { fetchIndiaNews } from "@/services/india/india-news";
import { getNseMarketStatus } from "@/lib/nse-market-hours";
import { useIndiaSettingsStore } from "@/stores/india-settings-store";
import type { IndexLtpSource } from "@/types/india";

export type IndiaUnderlying = "NIFTY" | "BANKNIFTY" | "FINNIFTY";

export function useIndiaOptions(underlying: IndiaUnderlying) {
  const demoMode = useIndiaSettingsStore((s) => s.demoMode);
  const minConfidence = useIndiaSettingsStore((s) => s.minConfidence);
  const marketOpen = getNseMarketStatus().isOpen;

  return useQuery({
    queryKey: ["india-options", underlying, demoMode, minConfidence],
    queryFn: async () => {
      const news = await fetchIndiaNews(demoMode);
      let chain = demoMode ? getDemoOptionChain(underlying) : null;

      if (!demoMode) {
        try {
          chain = (await fetchNseOptionChain(underlying)) ?? null;
        } catch {
          chain = null;
        }
      }

      if (!chain) chain = getDemoOptionChain(underlying);

      const { spotPrice, ltpSource } = await enrichChainWithLiveLtp(chain, underlying);
      chain = { ...chain, spotPrice, timestamp: Date.now() };

      const playbook = analyzeOptionChainFull(chain, news, minConfidence);
      playbook.spotPrice = spotPrice;
      playbook.ltpSource = ltpSource;

      return { ...playbook, chain, news, ltpSource };
    },
    staleTime: marketOpen ? 15_000 : 90_000,
    refetchInterval: marketOpen ? 30_000 : 120_000,
  });
}

export function formatLtpSourceLabel(source: IndexLtpSource): string {
  switch (source) {
    case "nse_index":
      return "NSE index (live)";
    case "nse_chain":
      return "NSE option chain";
    case "yahoo":
      return "Yahoo Finance";
    default:
      return "Estimated / demo";
  }
}
