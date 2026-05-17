"use client";

import { cn } from "@/lib/utils";
import type { SignalQuality } from "@/types";

const STYLE: Record<
  SignalQuality,
  { label: string; short: string; tone: string; bg: string; border: string }
> = {
  A: {
    label: "A · High quality",
    short: "A",
    tone: "text-bull",
    bg: "bg-bull/15",
    border: "border-bull/40",
  },
  B: {
    label: "B · Decent",
    short: "B",
    tone: "text-primary",
    bg: "bg-primary/15",
    border: "border-primary/40",
  },
  C: {
    label: "C · Low quality",
    short: "C",
    tone: "text-warning",
    bg: "bg-warning/15",
    border: "border-warning/40",
  },
};

export function QualityBadge({
  quality,
  compact,
  title,
}: {
  quality?: SignalQuality;
  compact?: boolean;
  title?: string;
}) {
  if (!quality) {
    return (
      <span className="text-[10px] text-muted-foreground" title="Grade not loaded">
        —
      </span>
    );
  }

  const s = STYLE[quality];
  return (
    <span
      title={title ?? s.label}
      className={cn(
        "inline-flex items-center justify-center rounded-md border font-semibold",
        s.bg,
        s.border,
        s.tone,
        compact ? "text-[10px] min-w-[1.25rem] px-1 py-0.5" : "text-xs px-1.5 py-0.5"
      )}
    >
      {compact ? s.short : s.label}
    </span>
  );
}
