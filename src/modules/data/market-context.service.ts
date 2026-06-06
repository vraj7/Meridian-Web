import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';
import { AppLogger } from '../../common/logger/app.logger';
import type { MarketContext } from '../../common/types';

@Injectable()
export class MarketContextService {
  constructor(
    private readonly http: HttpService,
    private readonly logger: AppLogger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async getMarketContext(): Promise<MarketContext> {
    const cacheKey = 'market:context';
    const cached = await this.cache.get<MarketContext>(cacheKey);
    if (cached) return cached;

    const [fearGreed, dominance] = await Promise.all([
      this.fetchFearGreed(),
      this.fetchBtcDominance(),
    ]);

    const ctx: MarketContext = {
      fearGreedIndex: fearGreed.value,
      fearGreedLabel: fearGreed.label,
      btcDominance: dominance.current,
      btcDominanceChange24h: dominance.change24h,
    };

    await this.cache.set(cacheKey, ctx, 300_000);
    return ctx;
  }

  private async fetchFearGreed(): Promise<{ value: number; label: string }> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<{ data?: Array<{ value: string; value_classification: string }> }>(
          'https://api.alternative.me/fng/',
          { params: { limit: 1 }, timeout: 8000 },
        ),
      );
      const row = data.data?.[0];
      return {
        value: row ? parseInt(row.value, 10) : 50,
        label: row?.value_classification ?? 'Neutral',
      };
    } catch (err) {
      this.logger.warn(`Fear & Greed fetch failed: ${String(err)}`, 'MarketContextService');
      return { value: 50, label: 'Neutral' };
    }
  }

  private async fetchBtcDominance(): Promise<{ current: number; change24h: number }> {
    try {
      const { data } = await firstValueFrom(
        this.http.get<{ data?: { market_cap_percentage?: { btc?: number } } }>(
          'https://api.coingecko.com/api/v3/global',
          { timeout: 8000 },
        ),
      );
      const btc = data.data?.market_cap_percentage?.btc ?? 50;
      return { current: btc, change24h: 0 };
    } catch (err) {
      this.logger.warn(`CoinGecko global failed: ${String(err)}`, 'MarketContextService');
      return { current: 50, change24h: 0 };
    }
  }
}
