import { DISCLAIMER } from "@/config/api";

export function Disclaimer({ className = "" }: { className?: string }) {
  return (
    <p className={`text-xs text-muted-foreground leading-relaxed ${className}`}>
      {DISCLAIMER}
    </p>
  );
}
