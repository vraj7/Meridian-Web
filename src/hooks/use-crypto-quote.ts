"use client";

import { useCryptoSettingsStore } from "@/stores/crypto-settings-store";
import { formatPairLabel, formatCryptoPriceLabel } from "@/config/market";

export function useCryptoQuotePair() {
  return useCryptoSettingsStore((s) => s.quotePair);
}

export function useFormatCryptoPair() {
  const quote = useCryptoQuotePair();
  return (symbol: string) => formatPairLabel(symbol, quote);
}

export function useCryptoPriceLabel() {
  const quote = useCryptoQuotePair();
  return formatCryptoPriceLabel(quote);
}
