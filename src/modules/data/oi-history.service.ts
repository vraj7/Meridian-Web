import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { OiHistoryEntity } from '../../entities';
import { CoinDcxService } from './coindcx.service';
import { isVercel } from '../../common/runtime';

/** Tracks 24h volume as OI proxy (CoinDCX has no public OI API). */
@Injectable()
export class OiHistoryService {
  private readonly memory = new Map<string, { timestamp: number; openInterest: number }[]>();

  constructor(
    @Optional() @InjectRepository(OiHistoryEntity)
    private readonly repo: Repository<OiHistoryEntity> | null,
    private readonly coindcx: CoinDcxService,
  ) {}

  async recordAndGetHistory(symbol: string): Promise<{ timestamp: number; openInterest: number }[]> {
    const volume = await this.coindcx.getVolume24h(symbol);

    if (isVercel || !this.repo) {
      const now = Date.now();
      const hist = (this.memory.get(symbol) ?? []).filter((r) => r.timestamp > now - 3_600_000);
      hist.push({ timestamp: now, openInterest: volume });
      this.memory.set(symbol, hist.slice(-20));
      return this.memory.get(symbol) ?? [];
    }

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
