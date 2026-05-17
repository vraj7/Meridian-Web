import type { CoinMarket } from "@/types";

/** Next `pageSize` markets starting at `offset`, wrapping at end of list. */
export function getMarketScanPage(
  markets: CoinMarket[],
  offset: number,
  pageSize: number
): CoinMarket[] {
  if (!markets.length || pageSize <= 0) return [];
  const size = Math.min(pageSize, markets.length);
  return Array.from({ length: size }, (_, i) => markets[(offset + i) % markets.length]);
}

/** Non-wrapping slice for full-universe scans (batch 1, 2, 3…). */
export function getLinearMarketScanPage(
  markets: CoinMarket[],
  offset: number,
  pageSize: number
): CoinMarket[] {
  if (!markets.length || pageSize <= 0 || offset >= markets.length) return [];
  return markets.slice(offset, offset + pageSize);
}

export function nextScanOffset(
  current: number,
  pageSize: number,
  total: number
): number {
  if (total <= 0) return 0;
  return (current + pageSize) % total;
}
