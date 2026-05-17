import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-7 w-7 shrink-0", className)}
      aria-hidden
    >
      <rect width="32" height="32" rx="8" className="fill-foreground" />
      <path
        d="M8 20 L13 12 L16 15.5 L19 10 L24 16"
        className="stroke-background"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LogoWordmark({
  className,
  showTagline = false,
}: {
  className?: string;
  showTagline?: boolean;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <span className="block font-semibold text-sm tracking-tight text-foreground">
        Meridian
      </span>
      {showTagline ? (
        <span className="block text-[10px] text-muted-foreground mt-0.5 leading-tight">
          Signals
        </span>
      ) : null}
    </div>
  );
}
