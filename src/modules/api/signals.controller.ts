import { Controller, Get, Param, Patch, Query, NotFoundException, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SignalSchedulerService } from '../signal/signal-scheduler.service';
import { BacktestService } from '../backtest/backtest.service';
import { ScanSettingsService } from '../data/scan-settings.service';
import { CoinDcxService } from '../data/coindcx.service';

import { isChartInterval, type ChartInterval } from '../../common/chart-intervals';
import { ChartAnalysisService } from './chart-analysis.service';
import { MarketLiveService } from './market-live.service';

@ApiTags('signals')
@Controller()
export class SignalsController {
  constructor(
    private readonly scheduler: SignalSchedulerService,
    private readonly backtest: BacktestService,
    private readonly scanSettings: ScanSettingsService,
    private readonly coindcx: CoinDcxService,
    private readonly chartAnalysis: ChartAnalysisService,
    private readonly marketLive: MarketLiveService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  health() {
    const scan = this.scheduler.getScanStatus();
    return {
      status: 'ok',
      exchange: 'coindcx-futures',
      scanPairCount: this.scanSettings.getPairCount(),
      lastSignalRun: this.scheduler.getLastRunAt(),
      signalCount: this.scheduler.getAllSignals().length,
      scan,
    };
  }

  @Get('settings/scan')
  @ApiOperation({ summary: 'Scan pair count settings' })
  getScanSettings() {
    return {
      count: this.scanSettings.getPairCount(),
      ...this.scanSettings.getLimits(),
    };
  }

  @Patch('settings/scan')
  @ApiOperation({ summary: 'Set how many pairs to scan (top by 24h volume)' })
  @ApiQuery({ name: 'count', required: true, example: 50 })
  updateScanSettings(@Query('count') count: string) {
    const n = this.scanSettings.setPairCount(parseInt(count, 10));
    return { count: n, ...this.scanSettings.getLimits() };
  }

  @Get('signals')
  @ApiOperation({ summary: 'Latest signal for a pair' })
  @ApiQuery({ name: 'pair', required: true, example: 'B-BTC_USDT' })
  getSignal(@Query('pair') pair: string) {
    const normalized = this.coindcx.normalizePair(pair);
    const signal = this.scheduler.getSignal(normalized);
    if (!signal) {
      throw new NotFoundException(
        `No signal for ${normalized}. Wait for scheduled scan or GET /signals/refresh`,
      );
    }
    return signal;
  }

  @Get('signals/top100')
  @ApiOperation({ summary: 'All latest signals from last scan' })
  getTop100() {
    return {
      count: this.scheduler.getAllSignals().length,
      scanPairCount: this.scanSettings.getPairCount(),
      lastRun: this.scheduler.getLastRunAt(),
      signals: this.scheduler.getAllSignals(),
    };
  }

  @Get('signals/scan-status')
  @ApiOperation({ summary: 'Current scan progress' })
  scanStatus() {
    return this.scheduler.getScanStatus();
  }

  @Get('signals/refresh')
  @ApiOperation({ summary: 'Trigger background scan (returns immediately)' })
  @ApiQuery({ name: 'count', required: false, example: 50 })
  refresh(@Query('count') count?: string) {
    const pairCount = count ? parseInt(count, 10) : undefined;
    return this.scheduler.triggerScan(pairCount);
  }

  @Get('market/:pair/candles')
  @ApiOperation({ summary: 'OHLC candles + EMA overlays for chart' })
  @ApiQuery({ name: 'interval', required: false, enum: ['5m', '15m', '1h', '4h', '1d'] })
  @ApiQuery({ name: 'limit', required: false, example: 120 })
  getCandles(
    @Param('pair') pair: string,
    @Query('interval') interval?: string,
    @Query('limit') limit?: string,
  ) {
    const lim = limit ? parseInt(limit, 10) : 120;
    const iv: ChartInterval = interval && isChartInterval(interval) ? interval : '4h';
    return this.chartAnalysis.getCandles(pair, iv, lim);
  }

  @Get('market/:pair/live')
  @ApiOperation({ summary: 'SSE live price + candle stream (CoinDCX proxy)' })
  @ApiQuery({ name: 'interval', required: false, enum: ['5m', '15m', '1h', '4h', '1d'] })
  streamLive(
    @Param('pair') pair: string,
    @Res() res: Response,
    @Query('interval') interval?: string,
  ): void {
    const iv: ChartInterval = interval && isChartInterval(interval) ? interval : '4h';
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const cleanup = this.marketLive.subscribe(
      pair,
      iv,
      (price, ts) => {
        res.write(`event: price\ndata: ${JSON.stringify({ price, ts })}\n\n`);
      },
      (bars) => {
        res.write(`event: candle\ndata: ${JSON.stringify({ bars })}\n\n`);
      },
      (connected) => {
        res.write(`event: status\ndata: ${JSON.stringify({ connected })}\n\n`);
      },
    );

    res.on('close', () => cleanup());
  }

  @Get('market/:pair/tick')
  @ApiOperation({ summary: 'Latest live price tick (polling fallback)' })
  getLiveTick(@Param('pair') pair: string) {
    return this.chartAnalysis.getLiveTick(pair);
  }

  @Get('market/:pair/analysis')
  @ApiOperation({ summary: 'Plain-English trade analysis for a pair on a timeframe' })
  @ApiQuery({ name: 'interval', required: false, enum: ['5m', '15m', '1h', '4h', '1d'] })
  getAnalysis(@Param('pair') pair: string, @Query('interval') interval?: string) {
    const iv: ChartInterval = interval && isChartInterval(interval) ? interval : '4h';
    return this.chartAnalysis.getAnalysis(pair, iv);
  }

  @Get('market/:pair/timeframes')
  @ApiOperation({ summary: 'All timeframe signals + action plan for a pair' })
  @ApiQuery({ name: 'horizon', required: false, enum: ['auto', 'scalp', 'day', 'swing'] })
  getMultiTimeframe(@Param('pair') pair: string, @Query('horizon') horizon?: string) {
    const allowed = ['auto', 'scalp', 'day', 'swing'] as const;
    const h = (allowed as readonly string[]).includes(horizon ?? '')
      ? (horizon as (typeof allowed)[number])
      : 'auto';
    return this.chartAnalysis.getMultiTimeframeOverview(pair, h);
  }

  @Get('backtest/:pair')
  @ApiOperation({ summary: 'Run backtest for a pair over N days (default 180)' })
  @ApiQuery({ name: 'days', required: false, example: 180 })
  async runBacktest(@Param('pair') pair: string, @Query('days') days?: string) {
    const d = days ? parseInt(days, 10) : 180;
    return this.backtest.runBacktest(pair, d);
  }
}
