import { Injectable } from '@nestjs/common';
import { CoinDcxService } from './coindcx.service';
import { CoinglassService } from './coinglass.service';
import { CryptoPanicService } from './cryptopanic.service';
import { OiHistoryService } from './oi-history.service';
import { AppLogger } from '../../common/logger/app.logger';
import type { PairMarketData } from '../../common/types';

const MIN_KLINES_1H = 30;
const MIN_KLINES_1D = 50;

@Injectable()
export class DataAggregatorService {
  constructor(
    private readonly coindcx: CoinDcxService,
    private readonly coinglass: CoinglassService,
    private readonly cryptopanic: CryptoPanicService,
    private readonly oiHistory: OiHistoryService,
    private readonly logger: AppLogger,
  ) {}

  async fetchPairData(symbol: string): Promise<PairMarketData | null> {
    try {
      const klines1h = await this.coindcx.getKlines(symbol, '1h', 120);
      const klines4h = await this.coindcx.getKlines(symbol, '4h', 120);
      const klines1d = await this.coindcx.getKlines(symbol, '1d', 250);
      const oiHist = await this.oiHistory.recordAndGetHistory(symbol);
      const funding = await this.coindcx.getFundingSnapshot(symbol);
      const mid = await this.coindcx.getOrderBookMid(symbol);

      if (klines1h.length < MIN_KLINES_1H || klines1d.length < MIN_KLINES_1D) {
        return null;
      }

      const entry = mid || klines1h[klines1h.length - 1].close;
      const liquidations = await this.coinglass.getLiquidationClusters(symbol, entry);
      const news = await this.cryptopanic.getNewsSentiment(this.coindcx.formatLabel(symbol));
      const cvdSnap = await this.coindcx.buildCvdSnapshot(symbol);

      return {
        symbol,
        klines1h,
        klines4h,
        klines1d,
        openInterest: oiHist.length ? oiHist[oiHist.length - 1].openInterest : 0,
        oiHistory: oiHist,
        fundingRate: funding.current,
        fundingRateAvg30d: funding.avg30d,
        orderBookMid: entry,
        cvd: cvdSnap,
        liquidations,
        newsPositive: news.positive,
        newsNegative: news.negative,
      };
    } catch (err) {
      this.logger.error(`fetchPairData failed ${symbol}`, String(err), 'DataAggregator');
      return null;
    }
  }

  async fetchAllPairs(
    symbols: string[],
    onProgress?: (index: number, total: number, symbol: string) => void,
  ): Promise<PairMarketData[]> {
    const results: PairMarketData[] = [];
    let skipped = 0;

    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      onProgress?.(i + 1, symbols.length, symbol);
      const data = await this.fetchPairData(symbol);
      if (data) results.push(data);
      else skipped++;
    }

    if (skipped > 0) {
      this.logger.log(
        `Fetched ${results.length}/${symbols.length} pairs (${skipped} skipped)`,
        'DataAggregator',
      );
    }

    return results;
  }
}
