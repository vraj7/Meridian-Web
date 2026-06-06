import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ScanSettingsService {
  private pairCount: number;
  private readonly minPairs: number;
  private readonly maxPairs: number;

  constructor(private readonly config: ConfigService) {
    this.minPairs = this.config.get<number>('app.scanPairCountMin', 5);
    this.maxPairs = this.config.get<number>('app.scanPairCountMax', 150);
    this.pairCount = this.clamp(this.config.get<number>('app.scanPairCount', 50));
  }

  getPairCount(): number {
    return this.pairCount;
  }

  setPairCount(count: number): number {
    this.pairCount = this.clamp(count);
    return this.pairCount;
  }

  getLimits(): { min: number; max: number; default: number } {
    return {
      min: this.minPairs,
      max: this.maxPairs,
      default: this.config.get<number>('app.scanPairCount', 50),
    };
  }

  private clamp(n: number): number {
    if (!Number.isFinite(n)) return this.config.get<number>('app.scanPairCount', 50);
    return Math.min(this.maxPairs, Math.max(this.minPairs, Math.round(n)));
  }
}
