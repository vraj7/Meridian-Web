import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AppLogger } from '../../common/logger/app.logger';
import type { LiquidationCluster } from '../../common/types';

@Injectable()
export class CoinglassService {
  private warnedMissing = false;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly logger: AppLogger,
  ) {}

  async getLiquidationClusters(symbol: string, currentPrice: number): Promise<LiquidationCluster[]> {
    const apiKey = this.config.get<string>('app.coinglassApiKey', '');
    if (!apiKey) {
      if (!this.warnedMissing) {
        this.logger.warn('COINGLASS_API_KEY missing — skipping liquidation filter', 'CoinglassService');
        this.warnedMissing = true;
      }
      return [];
    }

    try {
      const base = symbol.replace(/^B-/, '').replace(/_USDT$/, '').replace(/USDT$/, '');
      const { data } = await firstValueFrom(
        this.http.get<{ data?: Array<{ price: number; volUsd?: number; volume?: number }> }>(
          'https://open-api.coinglass.com/public/v2/liquidation_map',
          {
            headers: { coinglassSecret: apiKey },
            params: { symbol: base, time_type: 'h1' },
            timeout: 8000,
          },
        ),
      );

      const rows = data?.data ?? [];
      return rows
        .map((r) => ({
          price: Number(r.price),
          volumeUsd: Number(r.volUsd ?? r.volume ?? 0),
        }))
        .filter(
          (c) =>
            c.volumeUsd >= 5_000_000 &&
            Math.abs(c.price - currentPrice) / currentPrice <= 0.005,
        );
    } catch (err) {
      this.logger.warn(`Coinglass fetch failed for ${symbol}: ${String(err)}`, 'CoinglassService');
      return [];
    }
  }
}
