"use client";

import { Layers, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoadMoreCryptoButton({
  onLoadMore,
  onScanAll,
  loading,
  scanningAll,
  scanAllProgress,
  pageInfo,
  pageSize,
  isFullScanActive,
}: {
  onLoadMore: () => void;
  onScanAll: () => void;
  loading?: boolean;
  scanningAll?: boolean;
  scanAllProgress?: { current: number; total: number } | null;
  pageInfo: {
    pageIndex: number;
    totalPages: number;
    symbols: string[];
    totalCoins: number;
    fullScan?: boolean;
  } | null;
  pageSize: number;
  isFullScanActive?: boolean;
}) {
  if (!pageInfo) return null;

  const busy = loading || scanningAll;
  const scanAllLabel = scanningAll
    ? scanAllProgress
      ? `Scanning all… ${scanAllProgress.current}/${scanAllProgress.total}`
      : "Scanning all batches…"
    : `Scan all (${pageInfo.totalPages} batches)`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
        <Button
          type="button"
          variant="default"
          size="sm"
          className="gap-2 shrink-0"
          onClick={onScanAll}
          disabled={busy}
        >
          <Layers className={`h-3.5 w-3.5 ${scanningAll ? "animate-pulse" : ""}`} />
          {scanAllLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2 shrink-0"
          onClick={onLoadMore}
          disabled={busy || isFullScanActive}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading && !scanningAll ? "animate-spin" : ""}`} />
          {loading && !scanningAll ? "Scanning…" : `Scan next ${pageSize}`}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug">
        {isFullScanActive || pageInfo.fullScan ? (
          <>
            Full universe scan · {pageInfo.totalCoins} coins · {pageInfo.totalPages} batches
            completed
          </>
        ) : (
          <>
            Batch {pageInfo.pageIndex}/{pageInfo.totalPages} ·{" "}
            {pageInfo.symbols.slice(0, 6).join(", ")}
            {pageInfo.symbols.length > 6 ? ` +${pageInfo.symbols.length - 6}` : ""} ·{" "}
            {pageInfo.totalCoins} in universe
          </>
        )}
      </p>
    </div>
  );
}
