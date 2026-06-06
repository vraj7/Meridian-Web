import { Injectable, OnModuleInit } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';
import { AppLogger } from '../../common/logger/app.logger';
import { RateLimiterService } from './rate-limiter.service';
import { ScanSettingsService } from './scan-settings.service';
import type { CvdSnapshot, Kline } from '../../common/types';
import { CHART_INTERVAL_CONFIG, type ChartInterval } from '../../common/chart-intervals';

const API = 'https://api.coindcx.com';
const PUBLIC = 'https://public.coindcx.com';

interface FuturesPriceRow {
  fr?: number;
  efr?: number;
  v?: number;
  ls?: number;
  mp?: number;
}

interface CoindcxCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  time: number;
}

@Injectable()
export class CoinDcxService implements OnModuleInit {
  private topSymbols: string[] = [];
  private fundingHistory = new Map<string, number[]>();

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly logger: AppLogger,
    private readonly rateLimiter: RateLimiterService,
    private readonly scanSettings: ScanSettingsService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      this.topSymbols = await this.refreshTopSymbols();
      this.logger.log(
        `Loaded ${this.topSymbols.length} CoinDCX USDT futures pairs`,
        'CoinDcxService',
      );
    } catch (err) {
      this.logger.error('Failed to load CoinDCX pairs on init', String(err), 'CoinDcxService');
    }
  }

  getTopSymbols(): string[] {
    return [...this.topSymbols];
  }

  /** Display label e.g. B-BTC_USDT → BTC */
  formatLabel(pair: string): string {
    return pair.replace(/^B-/, '').replace(/_USDT$/, '');
  }

  /** CoinDCX pair e.g. B-BTC_USDT from BTC, BTCUSDT, or B-BTC_USDT */
  normalizePair(symbol: string): string {
    const u = symbol.toUpperCase().trim();
    if (u.startsWith('B-') && u.endsWith('_USDT')) return u;
    const base = u.replace(/_USDT$/, '').replace(/USDT$/, '');
    return `B-${base}_USDT`;
  }

  async refreshTopSymbols(): Promise<string[]> {
    const count = this.scanSettings.getPairCount();
    const cacheKey = `coindcx:top:v1:${count}`;
    const cached = await this.cache.get<string[]>(cacheKey);
    if (cached?.length) {
      this.topSymbols = cached;
      return cached;
    }

    const [active, prices] = await Promise.all([
      this.fetchActiveInstruments(),
      this.fetchFuturesPrices(),
    ]);

    const ranked = active
      .filter((p) => prices[p]?.v != null)
      .sort((a, b) => (prices[b]?.v ?? 0) - (prices[a]?.v ?? 0))
      .slice(0, count);

    this.topSymbols = ranked;
    await this.cache.set(cacheKey, ranked, 120_000);
    this.logger.log(
      `Universe: ${ranked.length} CoinDCX USDT futures (by 24h volume)`,
      'CoinDcxService',
    );
    return ranked;
  }

  private async fetchActiveInstruments(): Promise<string[]> {
    return this.rateLimiter.schedule(1, async () => {
      const res = await firstValueFrom(
        this.http.get<string[]>(
          `${API}/exchange/v1/derivatives/futures/data/active_instruments`,
          { params: { 'margin_currency_short_name[]': 'USDT' } },
        ),
      );
      return res.data.filter((p) => p.startsWith('B-') && p.endsWith('_USDT'));
    });
  }

  private async fetchFuturesPrices(): Promise<Record<string, FuturesPriceRow>> {
    return this.rateLimiter.schedule(1, async () => {
      const res = await firstValueFrom(
        this.http.get<{ prices: Record<string, FuturesPriceRow> }>(
          `${PUBLIC}/market_data/v3/current_prices/futures/rt`,
        ),
      );
      return res.data.prices ?? {};
    });
  }

  async getKlines(pair: string, interval: ChartInterval, limit = 120): Promise<Kline[]> {
    const cacheKey = `coindcx:klines:${pair}:${interval}:${limit}`;
    const cached = await this.cache.get<Kline[]>(cacheKey);
    if (cached) return cached;

    const { resolution, secondsPerBar } = CHART_INTERVAL_CONFIG[interval];
    const to = Math.floor(Date.now() / 1000);
    const from = to - limit * secondsPerBar * 1.2;

    const rows = await this.rateLimiter.schedule(1, async () => {
      const res = await firstValueFrom(
        this.http.get<{ s: string; data: CoindcxCandle[] }>(
          `${PUBLIC}/market_data/candlesticks`,
          {
            params: { pair, from, to, resolution, pcode: 'f' },
          },
        ),
      );
      return res.data.data ?? [];
    });

    const klines = rows
      .map((c) => ({
        openTime: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
        closeTime: c.time + secondsPerBar * 1000 - 1,
      }))
      .sort((a, b) => a.openTime - b.openTime)
      .slice(-limit);

    await this.cache.set(cacheKey, klines, this.config.get('app.cacheTtlMs', 60_000));
    return klines;
  }

  async getHistoricalKlines(
    pair: string,
    interval: ChartInterval,
    startTime: number,
    endTime: number,
  ): Promise<Kline[]> {
    const { resolution, secondsPerBar } = CHART_INTERVAL_CONFIG[interval];
    const from = Math.floor(startTime / 1000);
    const to = Math.floor(endTime / 1000);

    const rows = await this.rateLimiter.schedule(1, async () => {
      const res = await firstValueFrom(
        this.http.get<{ data: CoindcxCandle[] }>(`${PUBLIC}/market_data/candlesticks`, {
          params: { pair, from, to, resolution, pcode: 'f' },
        }),
      );
      return res.data.data ?? [];
    });

    return rows
      .map((c) => ({
        openTime: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
        closeTime: c.time + secondsPerBar * 1000 - 1,
      }))
      .sort((a, b) => a.openTime - b.openTime);
  }

  /** Volume 24h used as OI proxy (CoinDCX has no public OI endpoint). */
  async getVolume24h(pair: string): Promise<number> {
    const prices = await this.fetchFuturesPrices();
    return prices[pair]?.v ?? 0;
  }

  async getLiveQuote(pair: string): Promise<{ price: number; timestamp: number }> {
    const normalized = this.normalizePair(pair);
    const prices = await this.fetchFuturesPrices();
    const row = prices[normalized];
    return {
      price: row?.ls ?? row?.mp ?? 0,
      timestamp: Date.now(),
    };
  }

  async getFundingSnapshot(pair: string): Promise<{ current: number; avg30d: number }> {
    const prices = await this.fetchFuturesPrices();
    const row = prices[pair];
    const current = row?.efr ?? row?.fr ?? 0;

    const hist = this.fundingHistory.get(pair) ?? [];
    hist.push(current);
    if (hist.length > 90) hist.shift();
    this.fundingHistory.set(pair, hist);
    const avg30d = hist.length ? hist.reduce((a, b) => a + b, 0) / hist.length : current;

    return { current, avg30d };
  }

  async getOrderBookMid(pair: string): Promise<number> {
    const cacheKey = `coindcx:mid:${pair}`;
    const cached = await this.cache.get<number>(cacheKey);
    if (cached) return cached;

    const mid = await this.rateLimiter.schedule(1, async () => {
      const res = await firstValueFrom(
        this.http.get<{ asks: Record<string, string>; bids: Record<string, string> }>(
          `${PUBLIC}/market_data/v3/orderbook/${pair}-futures/10`,
        ),
      );
      const asks = Object.keys(res.data.asks ?? {})
        .map(Number)
        .sort((a, b) => a - b);
      const bids = Object.keys(res.data.bids ?? {})
        .map(Number)
        .sort((a, b) => b - a);
      const bestAsk = asks[0];
      const bestBid = bids[0];
      if (bestBid && bestAsk) return (bestBid + bestAsk) / 2;
      const prices = await this.fetchFuturesPrices();
      return prices[pair]?.ls ?? prices[pair]?.mp ?? 0;
    });

    await this.cache.set(cacheKey, mid, 15_000);
    return mid;
  }

  async buildCvdSnapshot(pair: string): Promise<CvdSnapshot | null> {
    try {
      const trades = await this.rateLimiter.schedule(1, async () => {
        const res = await firstValueFrom(
          this.http.get<Array<{ price: number; quantity: number; is_maker: boolean }>>(
            `${API}/exchange/v1/derivatives/futures/data/trades`,
            { params: { pair } },
          ),
        );
        return res.data ?? [];
      });

      if (trades.length < 10) return null;

      const mid = trades.length >> 1;
      const recent = trades.slice(mid);
      const prior = trades.slice(0, mid);

      let buyRecent = 0;
      let sellRecent = 0;
      let buyPrior = 0;
      let sellPrior = 0;
      let highR = 0;
      let lowR = Infinity;
      let highP = 0;
      let lowP = Infinity;

      for (const t of recent) {
        const notional = t.price * t.quantity;
        if (t.is_maker) sellRecent += notional;
        else buyRecent += notional;
        highR = Math.max(highR, t.price);
        lowR = Math.min(lowR, t.price);
      }
      for (const t of prior) {
        const notional = t.price * t.quantity;
        if (t.is_maker) sellPrior += notional;
        else buyPrior += notional;
        highP = Math.max(highP, t.price);
        lowP = Math.min(lowP, t.price);
      }

      const cvd1h = buyRecent - sellRecent;
      const prevCvd = buyPrior - sellPrior;

      const totalRecent = buyRecent + sellRecent;
      const netBuyRatio = totalRecent > 0 ? (buyRecent - sellRecent) / totalRecent : 0;

      return {
        symbol: pair,
        cvd1h,
        priceHigh1h: highR,
        priceLow1h: lowR === Infinity ? highR : lowR,
        prevPriceHigh: highP,
        prevPriceLow: lowP === Infinity ? (lowR === Infinity ? highR : lowR) : lowP,
        prevCvdHigh: prevCvd,
        prevCvdLow: prevCvd,
        bullishDivergence: highR > highP && cvd1h < prevCvd,
        bearishDivergence: (lowR === Infinity ? highR : lowR) < lowP && cvd1h > prevCvd,
        netBuyRatio,
        updatedAt: Date.now(),
      };
    } catch {
      return null;
    }
  }
}
