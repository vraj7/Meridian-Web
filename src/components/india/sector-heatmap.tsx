"use client";

import { cn, formatPercent } from "@/lib/utils";
import type { SectorScore } from "@/types/india-advanced";

export function SectorHeatmap({ sectors }: { sectors: SectorScore[] }) {
  const max = Math.max(...sectors.map((s) => Math.abs(s.momentum)), 1);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {sectors.map((s) => {
        const intensity = s.momentum / max;
        const bullish = s.momentum >= 0;
        return (
          <div
            key={s.id}
            className={cn(
              "rounded-lg border p-3 text-sm transition-colors",
              bullish ? "border-bull/30 bg-bull/10" : "border-bear/30 bg-bear/10"
            )}
            style={{ opacity: 0.65 + Math.abs(intensity) * 0.35 }}
          >
            <div className="flex justify-between items-start gap-1">
              <span className="font-medium text-xs leading-tight">{s.name}</span>
              <span className="text-[10px] text-muted-foreground">#{s.strengthRank}</span>
            </div>
            <p className={cn("font-mono text-xs mt-1", bullish ? "text-bull" : "text-bear")}>
              {formatPercent(s.avgChange24h)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{s.rotationSignal}</p>
          </div>
        );
      })}
    </div>
  );
}
