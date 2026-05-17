import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { getChartPriceFormat } from "@/lib/chart-price";
import { QUOTE_CURRENCY } from "@/config/market";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a USD-denominated price (decimals scale with magnitude). */
export function formatPrice(value: number, decimals?: number): string {
  const d = decimals ?? getChartPriceFormat(Math.abs(value)).precision;
  if (value >= 1000) {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: Math.min(d, 2),
      maximumFractionDigits: d,
    });
  }
  return value.toFixed(d);
}

export function formatUsd(value: number, decimals?: number): string {
  return `$${formatPrice(value, decimals)}`;
}

/** Format INR-denominated price (Indian equities & F&O). */
export function formatInr(value: number, decimals = 2): string {
  if (value >= 1000) {
    return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: decimals })}`;
  }
  return `₹${value.toFixed(decimals)}`;
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatCompact(num: number): string {
  if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toFixed(2);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export { QUOTE_CURRENCY };
