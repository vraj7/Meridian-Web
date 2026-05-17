import type { CryptoQuotePair } from "@/config/market";
import { getBinanceStreamPair, parseBaseFromPair } from "@/lib/pairs";

type PriceCallback = (symbol: string, price: number) => void;

interface Subscription {
  symbols: string[];
  quotePair: CryptoQuotePair;
}

class BinancePriceStream {
  private ws: WebSocket | null = null;
  private streamPairs = new Set<string>();
  private subs = new Map<PriceCallback, Subscription>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private throttleMs = 500;
  private lastEmit = new Map<string, number>();

  subscribe(
    symbols: string[],
    callback: PriceCallback,
    quotePair: CryptoQuotePair = "USDT"
  ): () => void {
    this.subs.set(callback, { symbols, quotePair });
    this.rebuildStreams();
    return () => {
      this.subs.delete(callback);
      this.rebuildStreams();
    };
  }

  private rebuildStreams(): void {
    this.streamPairs.clear();
    for (const { symbols, quotePair } of this.subs.values()) {
      symbols.forEach((base) => {
        const pair = getBinanceStreamPair(base, quotePair);
        if (pair) this.streamPairs.add(pair);
      });
    }
    if (this.subs.size === 0) {
      this.disconnect();
      return;
    }
    this.disconnect();
    this.connect();
  }

  private connect(): void {
    if (this.streamPairs.size === 0) return;

    const streams = [...this.streamPairs].map((s) => `${s}@ticker`).join("/");
    const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;

    try {
      this.ws = new WebSocket(url);
      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            data?: { s: string; c: string };
          };
          const data = msg.data;
          if (!data) return;
          const base = parseBaseFromPair(data.s);
          const price = parseFloat(data.c);
          const now = Date.now();
          const last = this.lastEmit.get(base) ?? 0;
          if (now - last < this.throttleMs) return;
          this.lastEmit.set(base, now);
          this.subs.forEach((_, cb) => cb(base, price));
        } catch {
          /* ignore parse errors */
        }
      };
      this.ws.onclose = () => this.scheduleReconnect();
      this.ws.onerror = () => this.ws?.close();
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5000);
  }

  private disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.ws?.close();
    this.ws = null;
  }
}

export const priceStream = new BinancePriceStream();
