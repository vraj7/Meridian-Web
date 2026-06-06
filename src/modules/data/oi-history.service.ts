import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { OiHistoryEntity } from '../../entities';
import { CoinDcxService } from './coindcx.service';

/** Tracks 24h volume as OI proxy (CoinDCX has no public OI API). */
@Injectable()
export class OiHistoryService {
  constructor(
    @InjectRepository(OiHistoryEntity)
    private readonly repo: Repository<OiHistoryEntity>,
    private readonly coindcx: CoinDcxService,
  ) {}

  async recordAndGetHistory(symbol: string): Promise<{ timestamp: number; openInterest: number }[]> {
    const volume = await this.coindcx.getVolume24h(symbol);
    await this.repo.save({ symbol, openInterest: volume });

    const oneHourAgo = new Date(Date.now() - 3_600_000);
    const rows = await this.repo.find({
      where: { symbol, recordedAt: MoreThan(oneHourAgo) },
      order: { recordedAt: 'ASC' },
      take: 20,
    });

    return rows.map((r) => ({
      timestamp: r.recordedAt.getTime(),
      openInterest: r.openInterest,
    }));
  }

  getOiChangePct(history: { openInterest: number }[]): number {
    if (history.length < 2) return 0;
    const oldest = history[0].openInterest;
    const latest = history[history.length - 1].openInterest;
    if (!oldest) return 0;
    return ((latest - oldest) / oldest) * 100;
  }
}
