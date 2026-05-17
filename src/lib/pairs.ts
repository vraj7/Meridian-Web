import {
  DELTA_EXCLUDED_SYMBOLS,
  isDeltaFuturesSymbol,
} from "@/config/delta-exchange-futures";
import {
  type CryptoQuotePair,
  type ExchangeQuoteSuffix,
  EXCHANGE_QUOTE_SUFFIXES,
  quoteSuffixOrder,
  QUOTE_CURRENCY,
} from "@/config/market";

/** Bases that are quote currencies / stables — no valid BTC-style pair. */
export const NON_TRADABLE_BASES = new Set([...DELTA_EXCLUDED_SYMBOLS]);

/** Build exchange trading pair e.g. BTCUSDT. */
export function symbolToTradingPair(
  symbol: string,
  suffix: ExchangeQuoteSuffix
): string {
  return `${symbol.toUpperCase()}${suffix}`;
}

/** All candidate pairs; preferred quote first, then fallback. */
export function getTradingPairCandidates(
  symbol: string,
  preferredQuote: CryptoQuotePair = "USD"
): string[] {
  const base = symbol.toUpperCase();
  if (NON_TRADABLE_BASES.has(base)) return [];
  return quoteSuffixOrder(preferredQuote)
    .filter((suffix) => suffix !== base)
    .map((suffix) => symbolToTradingPair(base, suffix));
}

/** Binance spot pair list for candle / price fetch. */
export function getBinanceSpotPairCandidates(
  symbol: string,
  preferredQuote: CryptoQuotePair = "USD"
): string[] {
  return getTradingPairCandidates(symbol, preferredQuote);
}

/** Binance USD-M futures symbols (always USDT-margined). */
export function getFuturesPairCandidates(symbol: string): string[] {
  const base = symbol.toUpperCase();
  if (NON_TRADABLE_BASES.has(base)) return [];
  return [`${base}USDT`];
}

/** Best Binance websocket stream pair for live ticks. */
export function getBinanceStreamPair(
  symbol: string,
  preferredQuote: CryptoQuotePair = "USDT"
): string | null {
  const candidates = getTradingPairCandidates(symbol, preferredQuote);
  if (!candidates.length) return null;
  const preferred = candidates.find((p) =>
    p.toUpperCase().endsWith(preferredQuote)
  );
  return (preferred ?? candidates[0]).toLowerCase();
}

export function isFuturesTradableBase(symbol: string): boolean {
  return isDeltaFuturesSymbol(symbol) && getFuturesPairCandidates(symbol).length > 0;
}

/** Extract base asset from BTCUSD / BTCUSDT / btcusd. */
export function parseBaseFromPair(pair: string): string {
  const upper = pair.toUpperCase();
  for (const suffix of [...EXCHANGE_QUOTE_SUFFIXES].sort((a, b) => b.length - a.length)) {
    if (upper.endsWith(suffix)) {
      return upper.slice(0, -suffix.length);
    }
  }
  return upper;
}

export function isUsdQuotedPair(pair: string): boolean {
  const upper = pair.toUpperCase();
  return EXCHANGE_QUOTE_SUFFIXES.some((s) => upper.endsWith(s));
}

export { QUOTE_CURRENCY };
