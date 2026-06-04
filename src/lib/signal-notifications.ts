import type { FuturesIntradaySignal } from "@/types/futures-intraday";
import type { SignalAction, TradingSignal } from "@/types";

const DEDUP_STORAGE_KEY = "meridian-notification-dedup";
const DEFAULT_COOLDOWN_MS = 30 * 60_000;

interface DedupEntry {
  key: string;
  at: number;
}

function loadDedup(): DedupEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(DEDUP_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DedupEntry[]) : [];
  } catch {
    return [];
  }
}

function saveDedup(entries: DedupEntry[]): void {
  try {
    sessionStorage.setItem(DEDUP_STORAGE_KEY, JSON.stringify(entries.slice(-80)));
  } catch {
    /* quota */
  }
}

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!isNotificationSupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

function shouldNotifyKey(key: string, cooldownMs = DEFAULT_COOLDOWN_MS): boolean {
  const now = Date.now();
  const kept = loadDedup().filter((e) => now - e.at < cooldownMs);
  if (kept.some((e) => e.key === key)) {
    saveDedup(kept);
    return false;
  }
  kept.push({ key, at: now });
  saveDedup(kept);
  return true;
}

export function showBrowserNotification(options: {
  title: string;
  body: string;
  tag: string;
  url?: string;
}): void {
  if (!isNotificationSupported() || Notification.permission !== "granted") return;

  const notification = new Notification(options.title, {
    body: options.body,
    tag: options.tag,
    icon: "/icon.svg",
  });

  notification.onclick = () => {
    window.focus();
    if (options.url) {
      window.location.assign(options.url);
    }
    notification.close();
  };
}

const ACTIONABLE: SignalAction[] = [
  "BUY NOW",
  "SELL NOW",
  "STRONG LONG",
  "STRONG SHORT",
];

/** Spot/futures card signal is actionable now (in zone, not wait). */
export function isActionableTradingSignal(signal: TradingSignal): boolean {
  if (!ACTIONABLE.includes(signal.action)) return false;
  if (signal.suggestWaitForPrice) return false;
  if (signal.entryTimingStatus === "wait_for_price" || signal.entryTimingStatus === "extended") {
    return false;
  }
  return true;
}

function intradayNotifyKey(signal: FuturesIntradaySignal): string {
  return `intraday:${signal.symbol}:${signal.direction}`;
}

function tradingNotifyKey(signal: TradingSignal, market: "futures" | "spot"): string {
  return `${market}:${signal.symbol}:${signal.action}:${signal.bestTimeframe}`;
}

/** Intraday-only alerts — price in zone, 5m confirm, near ideal entry. */
export function notifyIntradaySignals(
  signals: FuturesIntradaySignal[],
  opts?: { notifyWhenTabVisible?: boolean }
): number {
  if (!isNotificationSupported() || Notification.permission !== "granted") return 0;
  if (!opts?.notifyWhenTabVisible && document.visibilityState === "visible") return 0;

  let count = 0;
  for (const s of signals) {
    if (!s.readyToEnter) continue;

    const key = `${intradayNotifyKey(s)}:enter`;
    if (!shouldNotifyKey(key)) continue;

    const side = s.direction === "LONG" ? "Buy now" : "Sell now";
    showBrowserNotification({
      title: `${side} ${s.pairLabel} · ${s.confidence}%`,
      body: `${s.entryTimingNote} · $${s.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })} · SL $${s.stopLoss.toLocaleString(undefined, { maximumFractionDigits: 4 })}`,
      tag: key,
      url: "/futures/intraday",
    });
    count++;
  }
  return count;
}

/** Futures (or spot) tab — only when price is in entry zone, not wait/extended. */
export function notifyTradingSignals(
  signals: TradingSignal[],
  opts?: {
    notifyWhenTabVisible?: boolean;
    url?: string;
    market?: "futures" | "spot";
  }
): number {
  if (!isNotificationSupported() || Notification.permission !== "granted") return 0;
  if (!opts?.notifyWhenTabVisible && document.visibilityState === "visible") return 0;

  const market = opts?.market ?? "futures";
  const url = opts?.url ?? (market === "futures" ? "/futures" : "/spot");

  let count = 0;
  for (const s of signals.filter(isActionableTradingSignal)) {
    const key = `${tradingNotifyKey(s, market)}:enter`;
    if (!shouldNotifyKey(key)) continue;

    const isBuy = s.action.includes("LONG") || s.action === "BUY NOW";
    const timing =
      s.entryTimingNote ??
      (s.entryTimingStatus === "in_zone"
        ? "Price in entry zone — OK to enter"
        : s.oneLiner ?? "Setup ready");
    showBrowserNotification({
      title: `${isBuy ? "Buy now" : "Sell now"} ${s.pairLabel} · ${s.confidence}%`,
      body: `${s.action} · ${timing}`,
      tag: key,
      url,
    });
    count++;
  }
  return count;
}

export function clearNotificationDedup(): void {
  sessionStorage.removeItem(DEDUP_STORAGE_KEY);
}
