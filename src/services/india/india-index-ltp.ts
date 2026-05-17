import { INDIA_FNO_UNDERLYINGS } from "@/config/india-stocks";
import { fetchNseIndexQuotes, fetchNseOptionChain } from "@/services/india/nse-india";
import { fetchYahooQuote } from "@/services/india/yahoo-india";
import type { IndexLtpSource } from "@/types/india";

export interface IndexLtpQuote {
  underlying: string;
  price: number;
  change24h?: number;
  source: IndexLtpSource;
  asOf: number;
}

const NSE_INDEX_NAMES: Record<string, string> = {
  NIFTY: "NIFTY 50",
  BANKNIFTY: "NIFTY BANK",
  FINNIFTY: "NIFTY FIN SERVICE",
};

/** Live / near-live index LTP — NSE first, then Yahoo intraday meta, never stale daily close alone. */
export async function fetchIndiaIndexLtp(
  underlying: "NIFTY" | "BANKNIFTY" | "FINNIFTY"
): Promise<IndexLtpQuote | null> {
  const meta = INDIA_FNO_UNDERLYINGS.find((u) => u.symbol === underlying);
  if (!meta) return null;

  // 1) NSE official index snapshot (best during market hours)
  try {
    const indexName = NSE_INDEX_NAMES[underlying] as "NIFTY 50" | "NIFTY BANK" | "NIFTY FIN SERVICE";
    const rows = await fetchNseIndexQuotes(indexName);
    const row =
      rows?.find((r) => r.symbol.toUpperCase().includes(underlying.slice(0, 4))) ?? rows?.[0];
    if (row?.lastPrice && row.lastPrice > 0) {
      return {
        underlying,
        price: row.lastPrice,
        change24h: row.pChange,
        source: "nse_index",
        asOf: Date.now(),
      };
    }
  } catch {
    /* try chain */
  }

  // 2) NSE option chain underlyingValue (synced with F&O desk)
  try {
    const chain = await fetchNseOptionChain(underlying);
    if (chain?.spotPrice && chain.spotPrice > 0) {
      return {
        underlying,
        price: chain.spotPrice,
        source: "nse_chain",
        asOf: chain.timestamp,
      };
    }
  } catch {
    /* try yahoo */
  }

  // 3) Yahoo regularMarketPrice (intraday LTP, not yesterday's close)
  try {
    const q = await fetchYahooQuote(meta.yahoo, true);
    if (q.price > 0) {
      return {
        underlying,
        price: q.price,
        change24h: q.change24h,
        source: "yahoo",
        asOf: Date.now(),
      };
    }
  } catch {
    /* exhausted */
  }

  return null;
}

/** Apply best available LTP onto an option chain snapshot. */
export async function enrichChainWithLiveLtp(
  chain: { underlying: string; spotPrice: number; timestamp: number },
  underlying: "NIFTY" | "BANKNIFTY" | "FINNIFTY"
): Promise<{ spotPrice: number; ltpSource: IndexLtpSource }> {
  const live = await fetchIndiaIndexLtp(underlying);
  if (live && live.price > 0) {
    return { spotPrice: live.price, ltpSource: live.source };
  }
  return { spotPrice: chain.spotPrice, ltpSource: "demo" };
}
