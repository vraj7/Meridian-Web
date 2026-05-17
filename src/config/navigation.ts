import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Brain,
  Building2,
  Flame,
  Landmark,
  Layers,
  LayoutDashboard,
  Newspaper,
  RefreshCw,
  Settings,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

/** Sidebar navigation grouped by market. */
export const NAV_SECTIONS: NavSection[] = [
  {
    id: "crypto",
    label: "Crypto",
    items: [
      { href: "/", label: "Overview", icon: LayoutDashboard },
      { href: "/spot", label: "Spot", icon: TrendingUp },
      { href: "/futures", label: "Futures", icon: Zap },
      { href: "/insights", label: "Insights", icon: Brain },
      { href: "/heatmap", label: "Heatmap", icon: BarChart3 },
      { href: "/trending", label: "Trending", icon: Flame },
      { href: "/news", label: "News", icon: Newspaper },
      { href: "/watchlist", label: "Watchlist", icon: Star },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    id: "india",
    label: "Indian stocks",
    items: [
      { href: "/india/terminal", label: "Terminal", icon: Landmark },
      { href: "/india", label: "Market", icon: TrendingUp },
      { href: "/india/signals", label: "Signals", icon: Brain },
      { href: "/india/options", label: "Options", icon: Layers },
      { href: "/india/futures", label: "F&O futures", icon: Zap },
      { href: "/india/picks", label: "Picks", icon: Flame },
      { href: "/india/sectors", label: "Sectors", icon: BarChart3 },
      { href: "/india/screener", label: "Screener", icon: BarChart3 },
      { href: "/india/news", label: "News", icon: Newspaper },
      { href: "/india/rotation", label: "Rotation", icon: RefreshCw },
      { href: "/india/institutional", label: "FII / DII", icon: Building2 },
      { href: "/india/settings", label: "Settings", icon: Settings },
    ],
  },
];

/** Match active route without /india swallowing /india/terminal. */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/india") {
    return pathname === "/india" || pathname.startsWith("/india/stock");
  }
  if (href === "/india/settings") {
    return pathname === "/india/settings";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
