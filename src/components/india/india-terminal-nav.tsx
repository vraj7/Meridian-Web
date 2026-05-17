"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/india/terminal", label: "Terminal" },
  { href: "/india/sectors", label: "Sectors" },
  { href: "/india/screener", label: "Screener" },
  { href: "/india/signals", label: "AI Signals" },
  { href: "/india/news", label: "News" },
  { href: "/india/rotation", label: "Rotation" },
  { href: "/india/institutional", label: "FII/DII" },
  { href: "/india/options", label: "Options" },
  { href: "/india/futures", label: "Futures" },
  { href: "/india/picks", label: "Picks" },
];

export function IndiaTerminalNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto pb-2 scrollbar-thin">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={cn(
            "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium border transition-colors",
            pathname === l.href || pathname.startsWith(l.href + "/")
              ? "bg-primary/15 border-primary/40 text-primary"
              : "border-border/60 text-muted-foreground hover:text-foreground"
          )}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
