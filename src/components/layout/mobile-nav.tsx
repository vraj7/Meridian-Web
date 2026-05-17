"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, TrendingUp, Zap, Settings, Landmark } from "lucide-react";
import { isNavItemActive } from "@/config/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", icon: LayoutDashboard, label: "Home" },
  { href: "/spot", icon: TrendingUp, label: "Spot" },
  { href: "/futures", icon: Zap, label: "Futures" },
  { href: "/india/terminal", icon: Landmark, label: "NSE" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/95 backdrop-blur-md">
      <div className="flex justify-around py-2 safe-area-pb">
        {items.map((item) => {
          const active =
            item.href === "/india/terminal"
              ? pathname.startsWith("/india") && pathname !== "/india/settings"
              : isNavItemActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 text-[10px] px-2 py-1 min-w-[3rem]",
                active ? "text-foreground font-medium" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", active && "stroke-[2.5px]")} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
