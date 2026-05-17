"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoMark, LogoWordmark } from "@/components/brand/logo";
import { BRAND } from "@/config/brand";
import { isNavItemActive, NAV_SECTIONS } from "@/config/navigation";
import { cn } from "@/lib/utils";

function NavLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors",
        active
          ? "bg-foreground text-background font-medium"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      )}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-80" />
      {label}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-56 flex-col border-r border-border bg-card/50 h-screen sticky top-0">
      <div className="p-5 border-b border-border">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark />
          <LogoWordmark showTagline />
        </Link>
        <p className="text-[10px] text-muted-foreground mt-3 leading-relaxed">{BRAND.tagline}</p>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_SECTIONS.map((section, sectionIndex) => (
          <div key={section.id} className={cn(sectionIndex > 0 && "pt-4")}>
            <p className="px-2.5 py-2 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isNavItemActive(pathname, item.href)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
