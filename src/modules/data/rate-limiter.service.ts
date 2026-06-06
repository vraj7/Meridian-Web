import { Injectable } from '@nestjs/common';
import { AppLogger } from '../../common/logger/app.logger';

/** Token-bucket rate limiter synced with Binance x-mbx-used-weight-1m headers. */
@Injectable()
export class RateLimiterService {
  private readonly windowMs = 60_000;
  private readonly maxWeight = 1000;
  private usedWeight = 0;
  private windowStart = Date.now();
  private lastWaitLogAt = 0;
  private chain: Promise<void> = Promise.resolve();

  constructor(private readonly logger: AppLogger) {}

  /** Serialize Binance calls so weight tracking stays accurate. */
  schedule<T>(weight: number, fn: () => Promise<T>): Promise<T> {
    const task = this.chain.then(async () => {
      await this.acquire(weight);
      return fn();
    });
    this.chain = task.then(
      () => undefined,
      () => undefined,
    );
    return task;
  }

  async acquire(weight = 1): Promise<void> {
    this.refreshWindow();
    while (this.usedWeight + weight > this.maxWeight) {
      const wait = this.windowMs - (Date.now() - this.windowStart);
      const ms = Math.min(Math.max(wait, 200), 60_000);
      if (Date.now() - this.lastWaitLogAt > 10_000) {
        this.logger.warn(`Binance rate limit — pausing ~${Math.round(ms / 1000)}s`, 'RateLimiter');
        this.lastWaitLogAt = Date.now();
      }
      await sleep(ms);
      this.refreshWindow();
    }
    this.usedWeight += weight;
  }

  recordHeaders(usedWeight?: string | number, retryAfter?: string): void {
    if (usedWeight !== undefined) {
      const parsed = typeof usedWeight === 'string' ? parseInt(usedWeight, 10) : usedWeight;
      if (!Number.isNaN(parsed)) {
        this.usedWeight = parsed;
        this.windowStart = Date.now();
      }
    }
    if (retryAfter) {
      this.logger.warn(`Binance retry-after: ${retryAfter}s`, 'RateLimiter');
    }
  }

  private refreshWindow(): void {
    if (Date.now() - this.windowStart >= this.windowMs) {
      this.usedWeight = 0;
      this.windowStart = Date.now();
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
