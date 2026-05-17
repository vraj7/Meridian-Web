import { fetchNseJson } from "@/lib/nse-fetch";
import type { OptionChainSnapshot, OptionStrikeData } from "@/types/india";

interface NseIndexData {
  data?: Array<{
    symbol: string;
    lastPrice: number;
    pChange: number;
    totalTradedVolume: number;
  }>;
}

interface NseOptionChainResponse {
  records?: {
    underlyingValue?: number;
    expiryDates?: string[];
    data?: Array<{
      strikePrice: number;
      CE?: { openInterest?: number; impliedVolatility?: number; lastPrice?: number };
      PE?: { openInterest?: number; impliedVolatility?: number; lastPrice?: number };
    }>;
  };
}

export async function fetchNseIndexQuotes(
  indexName: "NIFTY 50" | "NIFTY BANK" | "NIFTY FIN SERVICE"
): Promise<NseIndexData["data"]> {
  const encoded = encodeURIComponent(indexName);
  const data = await fetchNseJson<NseIndexData>(
    `/equity-stockIndices?index=${encoded}`
  );
  return data.data ?? [];
}

export async function fetchNseOptionChain(
  underlying: "NIFTY" | "BANKNIFTY" | "FINNIFTY"
): Promise<OptionChainSnapshot | null> {
  const path =
    underlying === "NIFTY"
      ? `/option-chain-indices?symbol=${underlying}`
      : `/option-chain-indices?symbol=${underlying}`;

  const data = await fetchNseJson<NseOptionChainResponse>(path);
  const records = data.records;
  if (!records?.data?.length) return null;

  const spotPrice = records.underlyingValue ?? 0;
  const expiry = records.expiryDates?.[0] ?? "";
  const strikes: OptionStrikeData[] = records.data.map((row) => ({
    strike: row.strikePrice,
    callOi: row.CE?.openInterest ?? 0,
    putOi: row.PE?.openInterest ?? 0,
    callIv: row.CE?.impliedVolatility,
    putIv: row.PE?.impliedVolatility,
    callLtp: row.CE?.lastPrice,
    putLtp: row.PE?.lastPrice,
  }));

  const totalCall = strikes.reduce((s, r) => s + r.callOi, 0);
  const totalPut = strikes.reduce((s, r) => s + r.putOi, 0);

  return {
    underlying,
    spotPrice,
    expiry,
    strikes,
    pcr: totalCall > 0 ? totalPut / totalCall : 1,
    timestamp: Date.now(),
  };
}
