import { NextRequest, NextResponse } from "next/server";
import { CRYPTO_SCAN_BATCH_SIZE } from "@/config/crypto-scan";
import { scanCryptoBatch, type BatchScanCoin } from "@/lib/crypto-batch-scan";
import type { Timeframe } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;
/** Match /api/proxy region pinning so upstream calls aren't blocked by Binance/Bybit geo-rules. */
export const preferredRegion = ["bom1", "sin1", "fra1"];

const VALID_TF = new Set<Timeframe>(["1m", "5m", "15m", "1h", "4h", "1D", "1W"]);
const MAX_COINS = CRYPTO_SCAN_BATCH_SIZE;

function parseCoins(raw: unknown): BatchScanCoin[] | null {
  if (!Array.isArray(raw)) return null;
  const coins: BatchScanCoin[] = [];
  for (const item of raw.slice(0, MAX_COINS)) {
    if (!item || typeof item !== "object") continue;
    const symbol = String((item as BatchScanCoin).symbol ?? "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    const coinId = String((item as BatchScanCoin).coinId ?? symbol.toLowerCase()).slice(0, 64);
    if (!symbol) continue;
    coins.push({ symbol, coinId });
  }
  return coins.length ? coins : null;
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const coins = parseCoins(body.coins);
  if (!coins) {
    return NextResponse.json({ error: "coins array required" }, { status: 400 });
  }

  const market = body.market === "futures" ? "futures" : "spot";
  const timeframe = VALID_TF.has(body.timeframe as Timeframe)
    ? (body.timeframe as Timeframe)
    : "1h";
  const minConfidence =
    typeof body.minConfidence === "number"
      ? Math.min(90, Math.max(40, body.minConfidence))
      : 55;
  const relaxed = body.relaxed === true;
  const demoMode = body.demoMode === true;
  const quotePair = body.quotePair === "USDT" ? "USDT" : "USD";

  try {
    const result = await scanCryptoBatch({
      coins,
      market,
      timeframe,
      demoMode,
      minConfidence,
      relaxed,
      quotePair,
      concurrency: 14,
    });

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "private, max-age=20, stale-while-revalidate=40",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scan failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
