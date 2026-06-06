import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CoinDcxService } from '../data/coindcx.service';
import { DataAggregatorService } from '../data/data-aggregator.service';
import { MarketContextService } from '../data/market-context.service';
import { SignalEngineService } from './signal-engine.service';
import { SignalsGateway } from './signals.gateway';
import { ScanSettingsService } from '../data/scan-settings.service';
import { AppLogger } from '../../common/logger/app.logger';
import { isVercel } from '../../common/runtime';
import { SignalDirection, type TradingSignalDto } from '../../common/types';

export interface ScanStatusDto {
  running: boolean;
  queued: boolean;
  phase: 'idle' | 'fetching' | 'scoring';
  progress: number;
  total: number;
  currentSymbol: string | null;
  lastRun: string | null;
  signalCount: number;
  message: string | null;
}

@Injectable()
export class SignalSchedulerService implements OnModuleInit {
  private latestSignals = new Map<string, TradingSignalDto>();
  private isRunning = false;
  private scanQueued = false;
  private loopActive = false;
  private lastRunAt: string | null = null;
  private phase: ScanStatusDto['phase'] = 'idle';
  private progress = 0;
  private total = 0;
  private currentSymbol: string | null = null;
  private statusMessage: string | null = null;

  constructor(
    private readonly coindcx: CoinDcxService,
    private readonly aggregator: DataAggregatorService,
    private readonly engine: SignalEngineService,
    private readonly marketContext: MarketContextService,
    private readonly gateway: SignalsGateway,
    private readonly scanSettings: ScanSettingsService,
    private readonly logger: AppLogger,
  ) {}

  onModuleInit(): void {
    // Vercel has no cron and cold starts must stay fast — scans are manual via /signals/refresh.
    if (isVercel) return;
    setTimeout(() => this.triggerScan(), 5000);
  }

  @Cron('*/5 * * * *')
  handleCron(): void {
    this.triggerScan();
  }

  /** Start scan in background — returns immediately. Never blocks. */
  triggerScan(pairCount?: number): { status: 'started' | 'queued'; message: string; pairCount: number } {
    if (pairCount != null && Number.isFinite(pairCount)) {
      this.scanSettings.setPairCount(pairCount);
    }
    const n = this.scanSettings.getPairCount();

    if (this.isRunning || this.loopActive) {
      if (!this.scanQueued) {
        this.scanQueued = true;
        this.statusMessage = 'Scan queued — will run when current scan finishes';
        this.logger.log('Scan queued (already in progress)', 'SignalScheduler');
      }
      return {
        status: 'queued',
        message: 'Scan already running — your request is queued.',
        pairCount: n,
      };
    }

    this.statusMessage = 'Scan started';
    this.logger.log(`Scan triggered (${n} pairs)`, 'SignalScheduler');
    void this.runScanLoop();
    return {
      status: 'started',
      message: `Scan started — ${n} CoinDCX futures pairs (about 1–2 min).`,
      pairCount: n,
    };
  }

  getScanStatus(): ScanStatusDto {
    return {
      running: this.isRunning,
      queued: this.scanQueued,
      phase: this.phase,
      progress: this.progress,
      total: this.total,
      currentSymbol: this.currentSymbol,
      lastRun: this.lastRunAt,
      signalCount: this.latestSignals.size,
      message: this.statusMessage,
    };
  }

  private async runScanLoop(): Promise<void> {
    if (this.loopActive) return;
    this.loopActive = true;

    try {
      do {
        this.scanQueued = false;
        await this.executeScan();
      } while (this.scanQueued);
    } finally {
      this.loopActive = false;
    }
  }

  private async executeScan(): Promise<void> {
    this.isRunning = true;
    this.phase = 'fetching';
    this.progress = 0;
    const started = Date.now();
    this.logger.log(`Starting signal scan (${this.coindcx.getTopSymbols().length || '…'} pairs)`, 'SignalScheduler');

    try {
      const symbols = await this.coindcx.refreshTopSymbols();
      this.total = symbols.length;
      this.statusMessage = `Fetching market data (0/${this.total})…`;

      const marketCtx = await this.marketContext.getMarketContext();
      const pairsData = await this.aggregator.fetchAllPairs(
        symbols,
        (i: number, total: number, symbol: string) => {
          this.progress = i;
          this.total = total;
          this.currentSymbol = symbol;
          this.statusMessage = `Fetching ${this.coindcx.formatLabel(symbol)} (${i}/${total})…`;
        },
      );

      this.phase = 'scoring';
      this.total = pairsData.length;
      this.progress = 0;
      this.statusMessage = `Scoring setups (0/${this.total})…`;

      const signals: TradingSignalDto[] = [];
      for (let i = 0; i < pairsData.length; i++) {
        const data = pairsData[i];
        this.progress = i + 1;
        this.currentSymbol = data.symbol;
        this.statusMessage = `Scoring ${this.coindcx.formatLabel(data.symbol)} (${i + 1}/${this.total})…`;

        const signal = await this.engine.generateSignal(data, marketCtx);
        this.latestSignals.set(data.symbol, signal);
        signals.push(signal);

        if (signal.direction !== SignalDirection.NEUTRAL && !signal.weakSignal) {
          await this.engine.persistSignal(signal);
          this.logger.log(
            `${signal.symbol} ${signal.direction} conf=${signal.confidence} entry=${signal.entryPrice}`,
            'Signal',
          );
        }
      }

      this.lastRunAt = new Date().toISOString();
      this.gateway.broadcastSignals(signals);
      const secs = Math.round((Date.now() - started) / 1000);
      this.statusMessage = `Scan complete — ${signals.length} pairs in ${secs}s`;
      this.logger.log(`Signal scan complete: ${signals.length} pairs in ${secs}s`, 'SignalScheduler');
    } catch (err) {
      this.statusMessage = 'Scan failed — see server logs';
      this.logger.error('Signal scan failed', String(err), 'SignalScheduler');
    } finally {
      this.isRunning = false;
      this.phase = 'idle';
      this.currentSymbol = null;
      if (!this.scanQueued) {
        setTimeout(() => {
          if (!this.isRunning && !this.scanQueued) this.statusMessage = null;
        }, 8000);
      }
    }
  }

  getSignal(symbol: string): TradingSignalDto | undefined {
    const key = this.coindcx.normalizePair(symbol);
    return this.latestSignals.get(key);
  }

  getAllSignals(): TradingSignalDto[] {
    return Array.from(this.latestSignals.values());
  }

  getLastRunAt(): string | null {
    return this.lastRunAt;
  }
}
