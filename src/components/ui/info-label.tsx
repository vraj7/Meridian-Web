"use client";

import { useId, useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HelpEntry } from "@/config/signal-help";

interface InfoLabelProps {
  entry: HelpEntry;
  /** Show label text next to the icon (default true). */
  showLabel?: boolean;
  className?: string;
  labelClassName?: string;
  size?: "sm" | "md";
}

/** Label + (i) button; tap/click reveals plain-language help. */
export function InfoLabel({
  entry,
  showLabel = true,
  className,
  labelClassName,
  size = "sm",
}: InfoLabelProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <span className={cn("inline-block", className)}>
      <span className="inline-flex items-center gap-1">
        {showLabel ? (
          <span className={cn("text-muted-foreground", labelClassName)}>{entry.label}</span>
        ) : null}
        <button
          type="button"
          className={cn(
            "rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors",
            size === "sm" ? "p-0.5" : "p-1"
          )}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={`What is ${entry.label}?`}
          title={entry.plain}
          onClick={() => setOpen((o) => !o)}
        >
          <Info className={iconSize} />
        </button>
      </span>
      {open ? (
        <span
          id={panelId}
          role="note"
          className={cn(
            "block mt-1 rounded-md border border-border/60 bg-background/95 p-2 text-[11px] leading-relaxed text-muted-foreground shadow-sm",
            size === "md" && "text-xs"
          )}
        >
          <span className="text-foreground/90">{entry.plain}</span>
          {entry.detail ? <span className="block mt-1 opacity-90">{entry.detail}</span> : null}
        </span>
      ) : null}
    </span>
  );
}

/** Block label for grid cells (confidence, R:R, etc.). */
export function FieldLabel({
  entry,
  className,
}: {
  entry: HelpEntry;
  className?: string;
}) {
  return (
    <InfoLabel
      entry={entry}
      showLabel
      size="sm"
      className={cn("mb-0.5", className)}
      labelClassName="block text-[inherit]"
    />
  );
}
