import { CRYPTO_SCAN_BATCH_SIZE } from "@/config/crypto-scan";
import { getFullScanOffsets } from "@/lib/crypto-scan-client";
import { getLinearMarketScanPage } from "@/lib/crypto-scan-slice";
import { scanFuturesMtfBatch } from "@/lib/futures-mtf-scan";
import type { CryptoQuotePair } from "@/config/market";
import type { CoinMarket } from "@/types";
import type { FuturesMtfScanResult } from "@/types/futures-intraday";

export interface FuturesMtfFullScanParams {
  markets: CoinMarket[];
  demoMode: boolean;
  quotePair: CryptoQuotePair;
  pageSize?: number;
  onProgress?: (current: number, total: number) => void;
}

async function fetchFuturesMtfBatchApi(body: {
  coins: { symbol: string; coinId: string }[];
  demoMode: boolean;
  quotePair: CryptoQuotePair;
}): Promise<FuturesMtfScanResult> {
  const res = await fetch("/api/crypto/futures-mtf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `MTF scan failed (${res.status})`);
  }
  return res.json();
}

export async function scanAllFuturesMtfBatches(
  params: FuturesMtfFullScanParams
): Promise<FuturesMtfScanResult> {
  const { markets, demoMode, quotePair, pageSize = CRYPTO_SCAN_BATCH_SIZE, onProgress } = params;
  const offsets = getFullScanOffsets(markets.length, pageSize);
  const mergedSignals: FuturesMtfScanResult["signals"] = [];
  const mergedAssessments: FuturesMtfScanResult["assessments"] = [];
  let scanned = 0;
  let rejected = 0;

  for (let i = 0; i < offsets.length; i++) {
    onProgress?.(i + 1, offsets.length);
    const page = getLinearMarketScanPage(markets, offsets[i]!, pageSize);
    const coins = page.map((m) => ({ symbol: m.symbol, coinId: m.id }));

    const raw = demoMode
      ? await scanFuturesMtfBatch({ coins, demoMode: true, quotePair, concurrency: 6 })
      : await fetchFuturesMtfBatchApi({ coins, demoMode: false, quotePair });

    mergedSignals.push(...raw.signals);
    mergedAssessments.push(...raw.assessments);
    scanned += raw.scanned;
    rejected += raw.rejected;
  }

  mergedSignals.sort((a, b) => b.confidence - a.confidence);
  mergedAssessments.sort((a, b) => b.confidence - a.confidence);

  return {
    signals: mergedSignals,
    assessments: mergedAssessments,
    scanned,
    rejected,
  };
}
