import { filterSignals } from "@/engines/risk-engine";
import { rankSignals } from "@/engines/signal-engine";
import { scanCryptoBatch } from "@/lib/crypto-batch-scan";
import { getLinearMarketScanPage } from "@/lib/crypto-scan-slice";
import type { CryptoQuotePair } from "@/config/market";
import type { CoinGrade, CoinMarket, Timeframe, TradingSignal } from "@/types";

export interface BatchAnalysisResult {
  signals: TradingSignal[];
  grades: Record<string, CoinGrade>;
}

export interface CryptoBatchScanParams {
  markets: CoinMarket[];
  market: "spot" | "futures";
  timeframe: Timeframe;
  minConfidence: number;
  relaxed: boolean;
  demoMode: boolean;
  quotePair: CryptoQuotePair;
}

/** Offsets for each non-overlapping batch covering the full universe. */
export function getFullScanOffsets(totalCoins: number, pageSize: number): number[] {
  if (totalCoins <= 0 || pageSize <= 0) return [];
  const pages = Math.ceil(totalCoins / pageSize);
  return Array.from({ length: pages }, (_, i) => i * pageSize);
}

export async function fetchCryptoBatchScan(
  params: CryptoBatchScanParams & { limit: number }
): Promise<BatchAnalysisResult> {
  const coins = params.markets.slice(0, params.limit).map((m) => ({
    symbol: m.symbol,
    coinId: m.id,
  }));

  if (!coins.length) return { signals: [], grades: {} };

  const raw = params.demoMode
    ? await scanCryptoBatch({
        coins,
        market: params.market,
        timeframe: params.timeframe,
        demoMode: true,
        minConfidence: params.minConfidence,
        relaxed: params.relaxed,
        quotePair: params.quotePair,
      })
    : await fetchCryptoBatchScanApi({
        coins,
        market: params.market,
        timeframe: params.timeframe,
        minConfidence: params.minConfidence,
        relaxed: params.relaxed,
        quotePair: params.quotePair,
      });

  return raw;
}

async function fetchCryptoBatchScanApi(body: {
  coins: { symbol: string; coinId: string }[];
  market: "spot" | "futures";
  timeframe: Timeframe;
  minConfidence: number;
  relaxed: boolean;
  quotePair: CryptoQuotePair;
}): Promise<BatchAnalysisResult> {
  const res = await fetch("/api/crypto/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, demoMode: false }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `Scan failed (${res.status})`);
  }

  return res.json() as Promise<BatchAnalysisResult>;
}

export function postProcessBatchSignals(
  raw: BatchAnalysisResult,
  minConfidence: number,
  relaxed: boolean,
  stabilize: (signals: BatchAnalysisResult["signals"], lockMs: number) => BatchAnalysisResult["signals"],
  lockMs: number
): BatchAnalysisResult {
  return {
    signals: stabilize(
      rankSignals(
        filterSignals(raw.signals, minConfidence, {
          relaxed,
        })
      ),
      lockMs
    ),
    grades: raw.grades,
  };
}

export async function scanAllCryptoBatches(
  params: CryptoBatchScanParams & {
    pageSize: number;
    onProgress?: (current: number, total: number) => void;
    stabilize: (signals: BatchAnalysisResult["signals"], lockMs: number) => BatchAnalysisResult["signals"];
    lockMs: number;
  }
): Promise<BatchAnalysisResult> {
  const { markets, pageSize, onProgress, stabilize, lockMs, ...rest } = params;
  const offsets = getFullScanOffsets(markets.length, pageSize);
  const mergedSignals: BatchAnalysisResult["signals"] = [];
  const mergedGrades: BatchAnalysisResult["grades"] = {};

  for (let i = 0; i < offsets.length; i++) {
    onProgress?.(i + 1, offsets.length);
    const page = getLinearMarketScanPage(markets, offsets[i]!, pageSize);
    const raw = await fetchCryptoBatchScan({ ...rest, markets: page, limit: pageSize });
    mergedSignals.push(...raw.signals);
    Object.assign(mergedGrades, raw.grades);
  }

  return postProcessBatchSignals(
    { signals: mergedSignals, grades: mergedGrades },
    rest.minConfidence,
    rest.relaxed,
    stabilize,
    lockMs
  );
}
