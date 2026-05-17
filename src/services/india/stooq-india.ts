import { fetchTextWithCors } from "@/lib/cors-fetch";
import { NIFTY_50_STOCKS } from "@/config/india-stocks";

/** Stooq symbol e.g. reliance.in */
function toStooqSymbol(yahooSymbol: string): string {
  const stock = NIFTY_50_STOCKS.find((s) => s.yahoo === yahooSymbol);
  if (stock) return `${stock.symbol.toLowerCase()}.in`;
  const base = yahooSymbol.replace(/\.NS$/i, "").replace(/^\^/, "").toLowerCase();
  if (base === "nsei") return "^nsei";
  if (base === "nsebank") return "^nbx";
  return `${base}.in`;
}

/** Fallback quotes when Yahoo is blocked (CSV via CORS proxy). */
export async function fetchStooqQuote(yahooSymbol: string): Promise<{
  price: number;
  change24h: number;
  volume: number;
} | null> {
  try {
    const sym = toStooqSymbol(yahooSymbol);
    const url = `https://stooq.pl/q/l/?s=${encodeURIComponent(sym)}&f=sd2t2ohlcv&h&e=csv`;
    const csv = await fetchTextWithCors(url);
    const lines = csv.trim().split("\n");
    if (lines.length < 2) return null;
    const cols = lines[1].split(",");
    const close = parseFloat(cols[6]);
    const open = parseFloat(cols[3]);
    if (!Number.isFinite(close)) return null;
    const change24h = open ? ((close - open) / open) * 100 : 0;
    return { price: close, change24h, volume: parseFloat(cols[7]) || 0 };
  } catch {
    return null;
  }
}
