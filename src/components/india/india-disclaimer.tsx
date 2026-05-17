export function IndiaDisclaimer({ className = "" }: { className?: string }) {
  return (
    <p
      className={`text-[11px] text-muted-foreground border border-border/50 rounded-lg px-3 py-2 bg-muted/20 ${className}`}
    >
      This platform is for educational purposes only and not financial advice. Predictions are
      probabilistic — never guaranteed. Prioritize capital preservation and position sizing.
    </p>
  );
}
