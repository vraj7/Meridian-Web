import { NextRequest, NextResponse } from "next/server";
import { CRYPTO_SCAN_BATCH_SIZE } from "@/config/crypto-scan";
import { scanFuturesMtfBatch, type FuturesMtfScanCoin } from "@/lib/futures-mtf-scan";

export const runtime = "nodejs";
export const maxDuration = 60;
export const preferredRegion = ["bom1", "sin1", "fra1"];

const MAX_COINS = CRYPTO_SCAN_BATCH_SIZE;

function parseCoins(raw: unknown): FuturesMtfScanCoin[] | null {
  if (!Array.isArray(raw)) return null;
  const coins: FuturesMtfScanCoin[] = [];
  for (const item of raw.slice(0, MAX_COINS)) {
    if (!item || typeof item !== "object") continue;
    const symbol = String((item as FuturesMtfScanCoin).symbol ?? "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    const coinId = String((item as FuturesMtfScanCoin).coinId ?? symbol.toLowerCase()).slice(0, 64);
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

  const demoMode = body.demoMode === true;
  const quotePair = body.quotePair === "USDT" ? "USDT" : "USD";

  try {
    const result = await scanFuturesMtfBatch({
      coins,
      demoMode,
      quotePair,
      concurrency: 10,
    });

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "private, max-age=45, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "MTF scan failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
