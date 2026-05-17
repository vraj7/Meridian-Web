"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useCryptoSettingsStore } from "@/stores/crypto-settings-store";
import type { CryptoQuotePair } from "@/config/market";

const OPTIONS: { value: CryptoQuotePair; label: string; hint: string }[] = [
  {
    value: "USD",
    label: "USD",
    hint: "Delta-style labels · tries BTCUSD on exchanges, falls back to USDT",
  },
  {
    value: "USDT",
    label: "USDT",
    hint: "Binance liquid pairs · BTC/USDT charts and live prices",
  },
];

export function QuotePairToggle({ className }: { className?: string }) {
  const pathname = usePathname();
  const quotePair = useCryptoSettingsStore((s) => s.quotePair);
  const setQuotePair = useCryptoSettingsStore((s) => s.setQuotePair);

  if (pathname.startsWith("/india")) return null;

  return (
    <div
      className={cn("flex items-center gap-1 rounded-md border border-border p-0.5", className)}
      role="group"
      aria-label="Quote currency for crypto pairs"
    >
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          title={opt.hint}
          onClick={() => setQuotePair(opt.value)}
          className={cn(
            "rounded px-2.5 py-1 text-[11px] font-medium transition-colors",
            quotePair === opt.value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
