"use client";

import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveCryptoSignalFilters } from "@/config/crypto-signal-filters";
import { cn } from "@/lib/utils";
import { useCryptoSettingsStore } from "@/stores/crypto-settings-store";

export function RelaxedCryptoToggle({ className }: { className?: string }) {
  const relaxed = useCryptoSettingsStore((s) => s.relaxedCryptoSignals);
  const setRelaxed = useCryptoSettingsStore((s) => s.setRelaxedCryptoSignals);
  const minConfidence = useCryptoSettingsStore((s) => s.minConfidence);
  const filters = resolveCryptoSignalFilters(minConfidence, relaxed);

  return (
    <div className={cn("flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3", className)}>
      <Button
        type="button"
        variant={relaxed ? "default" : "outline"}
        size="sm"
        className="gap-2 shrink-0"
        onClick={() => setRelaxed(!relaxed)}
        title="Relaxed mode lowers confidence, confirmation, and risk/reward requirements for crypto scans."
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        {relaxed ? "Relaxed filters on" : "Show more setups"}
      </Button>
      <p className="text-[11px] text-muted-foreground leading-snug">
        {relaxed
          ? `Scanning at ≥${filters.minConfidence}% conf., ${filters.minConfirmations}+ confirmations, R:R ≥ ${filters.minRiskReward} — watchlist only, not live trade advice.`
          : "Strict: Settings min confidence, 3+ confirmations, R:R ≥ 1.4 (spot sells allowed)."}
      </p>
    </div>
  );
}
