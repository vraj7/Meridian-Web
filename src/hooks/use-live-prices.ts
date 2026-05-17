"use client";

import { useEffect, useState } from "react";
import { priceStream } from "@/lib/websocket";
import { useCryptoSettingsStore } from "@/stores/crypto-settings-store";

export function useLivePrices(symbols: string[]) {
  const demoMode = useCryptoSettingsStore((s) => s.demoMode);
  const quotePair = useCryptoSettingsStore((s) => s.quotePair);
  const [prices, setPrices] = useState<Record<string, number>>({});

  const symbolKey = symbols.join(",");

  useEffect(() => {
    if (demoMode || symbols.length === 0) return;

    const unsub = priceStream.subscribe(
      symbols,
      (symbol, price) => {
        setPrices((prev) => ({ ...prev, [symbol]: price }));
      },
      quotePair
    );

    return unsub;
  }, [symbolKey, demoMode, quotePair, symbols]);

  return prices;
}
