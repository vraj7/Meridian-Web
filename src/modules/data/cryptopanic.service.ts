import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { firstValueFrom } from 'rxjs';
import { AppLogger } from '../../common/logger/app.logger';

@Injectable()
export class CryptoPanicService {
  private warnedMissing = false;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly logger: AppLogger,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async getNewsSentiment(coinSymbol: string): Promise<{ positive: number; negative: number }> {
    const apiKey = this.config.get<string>('app.cryptopanicApiKey', '');
    if (!apiKey) {
      if (!this.warnedMissing) {
        this.logger.warn('CRYPTOPANIC_API_KEY missing — skipping news sentiment', 'CryptoPanicService');
        this.warnedMissing = true;
      }
      return { positive: 0, negative: 0 };
    }

    const base = coinSymbol.replace('USDT', '').toLowerCase();
    const cacheKey = `news:${base}`;
    const cached = await this.cache.get<{ positive: number; negative: number }>(cacheKey);
    if (cached) return cached;

    try {
      const { data } = await firstValueFrom(
        this.http.get<{
          results?: Array<{ votes?: { positive?: number; negative?: number } }>;
        }>('https://cryptopanic.com/api/v1/posts/', {
          params: {
            auth_token: apiKey,
            currencies: base,
            filter: 'hot',
            public: true,
          },
          timeout: 8000,
        }),
      );

      let positive = 0;
      let negative = 0;
      for (const post of data.results ?? []) {
        positive += post.votes?.positive ?? 0;
        negative += post.votes?.negative ?? 0;
      }

      const result = { positive, negative };
      await this.cache.set(cacheKey, result, 300_000);
      return result;
    } catch (err) {
      this.logger.warn(`CryptoPanic failed for ${base}: ${String(err)}`, 'CryptoPanicService');
      return { positive: 0, negative: 0 };
    }
  }
}
