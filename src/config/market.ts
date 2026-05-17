/** Crypto spot/futures quote asset shown in labels and used for exchange symbols. */
export type CryptoQuotePair = "USD" | "USDT";

/** @deprecated Use settings quotePair or formatPairLabel(symbol, quote). */
export const QUOTE_CURRENCY = "USD" as const;

export const EXCHANGE_QUOTE_SUFFIXES = ["USD", "USDT"] as const;

export type ExchangeQuoteSuffix = (typeof EXCHANGE_QUOTE_SUFFIXES)[number];

export function quoteSuffixOrder(preferred: CryptoQuotePair): ExchangeQuoteSuffix[] {
  return preferred === "USDT" ? ["USDT", "USD"] : ["USD", "USDT"];
}

export function formatPairLabel(
  baseSymbol: string,
  quote: CryptoQuotePair = "USD"
): string {
  return `${baseSymbol.toUpperCase()}/${quote}`;
}

export function formatCryptoPriceLabel(quote: CryptoQuotePair = "USD"): string {
  return `Price (${quote})`;
}

/** @deprecated Use formatCryptoPriceLabel */
export function formatUsdPriceLabel(): string {
  return formatCryptoPriceLabel("USD");
}

export const INDIA_QUOTE_CURRENCY = "INR" as const;

export function formatIndiaPairLabel(symbol: string): string {
  return `${symbol.toUpperCase()}/${INDIA_QUOTE_CURRENCY}`;
}

export function formatIndiaPriceLabel(): string {
  return `Price (${INDIA_QUOTE_CURRENCY})`;
}
