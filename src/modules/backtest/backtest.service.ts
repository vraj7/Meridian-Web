import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CoinDcxService } from '../data/coindcx.service';
import { IndicatorsService } from '../indicators/indicators.service';
import { SignalEngineService } from '../signal/signal-engine.service';
import { BacktestResultEntity } from '../../entities';
import { AppLogger } from '../../common/logger/app.logger';
import { type BacktestResultDto, type Kline } from '../../common/types';

interface SimTrade {
  pnl: number;
  riskReward: number;
  win: boolean;
}

@Injectable()
export class BacktestService {
  private readonly slippage = 0.0005;
  private readonly takerFee = 0.0006;

  constructor(
    private readonly coindcx: CoinDcxService,
    private readonly indicators: IndicatorsService,
    private readonly signalEngine: SignalEngineService,
    private readonly logger: AppLogger,
    @InjectRepository(BacktestResultEntity)
    private readonly repo: Repository<BacktestResultEntity>,
  ) {}

  async runBacktest(symbol: string, days = 180): Promise<BacktestResultDto> {
    const pair = this.coindcx.normalizePair(symbol);
    const end = Date.now();
    const start = end - days * 86_400_000;

    this.logger.log(`Backtest ${pair} for ${days} days`, 'BacktestService');

    const klines1h = await this.coindcx.getHistoricalKlines(pair, '1h', start, end);
    const klines4h = await this.resampleOrFetch(pair, '4h', start, end);
    const klines1d = await this.coindcx.getHistoricalKlines(
      pair,
      '1d',
      start - 200 * 86_400_000,
      end,
    );

    const trades: SimTrade[] = [];
    const equity: number[] = [100];

    for (let i = 200; i < klines1h.length - 24; i += 24) {
      const slice1h = klines1h.slice(0, i + 1);
      const slice4h = klines4h.filter((k) => k.closeTime <= slice1h[slice1h.length - 1].closeTime);
      const slice1d = klines1d.filter((k) => k.closeTime <= slice1h[slice1h.length - 1].closeTime);

      if (slice1d.length < 200 || slice4h.length < 30) continue;

      const trend = this.indicators.analyzeDailyTrend(slice1d);
      if (trend.adx < 20) continue;

      const momentum = this.indicators.analyze4hMomentum(slice4h);
      const entry = slice1h[slice1h.length - 1].close;

      let direction: 'long' | 'short' | null = null;
      if (trend.trend === 'uptrend' && momentum.macdCrossBullish) direction = 'long';
      if (trend.trend === 'downtrend' && momentum.macdCrossBearish) direction = 'short';
      if (!direction) continue;

      const { stopLoss, takeProfit1 } = this.indicators.computeSlTp(
        slice1h.slice(-10),
        entry,
        direction,
        trend.atrRatio,
      );

      const trade = this.simulateTrade(klines1h.slice(i, i + 48), direction, entry, stopLoss, takeProfit1);
      if (trade) {
        trades.push(trade);
        equity.push(equity[equity.length - 1] * (1 + trade.pnl / 100));
      }
    }

    const result = this.computeMetrics(pair, days, trades, equity);
    await this.repo.save({
      symbol: pair,
      days,
      totalReturnPct: result.totalReturnPct,
      sharpeRatio: result.sharpeRatio,
      maxDrawdownPct: result.maxDrawdownPct,
      winRatePct: result.winRatePct,
      avgRiskReward: result.avgRiskReward,
      profitFactor: result.profitFactor,
      totalTrades: result.totalTrades,
      poorMetrics: result.poorMetrics,
    });

    if (result.poorMetrics) {
      this.signalEngine.setBacktestDiscount(pair, result.confidenceDiscount);
      this.logger.warn(
        `${pair} poor backtest — live confidence discounted ${result.confidenceDiscount}%`,
        'BacktestService',
      );
    }

    return result;
  }

  private simulateTrade(
    forward: Kline[],
    direction: 'long' | 'short',
    entry: number,
    stopLoss: number,
    takeProfit1: number,
  ): SimTrade | null {
    if (!forward.length) return null;

    const entryFill =
      direction === 'long' ? entry * (1 + this.slippage) : entry * (1 - this.slippage);
    const risk = Math.abs(entryFill - stopLoss);
    if (risk <= 0) return null;

    for (const bar of forward) {
      if (direction === 'long') {
        if (bar.low <= stopLoss) {
          const exit = stopLoss * (1 - this.slippage);
          const pnlPct = ((exit - entryFill) / entryFill - this.takerFee * 2) * 100;
          return { pnl: pnlPct, riskReward: Math.abs(pnlPct / ((risk / entryFill) * 100)), win: false };
        }
        if (bar.high >= takeProfit1) {
          const exit = takeProfit1 * (1 - this.slippage);
          const pnlPct = ((exit - entryFill) / entryFill - this.takerFee * 2) * 100;
          return { pnl: pnlPct, riskReward: Math.abs(pnlPct / ((risk / entryFill) * 100)), win: true };
        }
      } else {
        if (bar.high >= stopLoss) {
          const exit = stopLoss * (1 + this.slippage);
          const pnlPct = ((entryFill - exit) / entryFill - this.takerFee * 2) * 100;
          return { pnl: pnlPct, riskReward: Math.abs(pnlPct / ((risk / entryFill) * 100)), win: false };
        }
        if (bar.low <= takeProfit1) {
          const exit = takeProfit1 * (1 + this.slippage);
          const pnlPct = ((entryFill - exit) / entryFill - this.takerFee * 2) * 100;
          return { pnl: pnlPct, riskReward: Math.abs(pnlPct / ((risk / entryFill) * 100)), win: true };
        }
      }
    }
    return null;
  }

  private computeMetrics(
    symbol: string,
    days: number,
    trades: SimTrade[],
    equity: number[],
  ): BacktestResultDto {
    if (!trades.length) {
      return {
        symbol,
        days,
        totalReturnPct: 0,
        sharpeRatio: 0,
        maxDrawdownPct: 0,
        winRatePct: 0,
        avgRiskReward: 0,
        profitFactor: 0,
        totalTrades: 0,
        poorMetrics: true,
        confidenceDiscount: 20,
        generatedAt: new Date().toISOString(),
      };
    }

    const wins = trades.filter((t) => t.win);
    const winRatePct = (wins.length / trades.length) * 100;
    const totalReturnPct = equity[equity.length - 1] - 100;
    const returns = trades.map((t) => t.pnl / 100);
    const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
    const std = Math.sqrt(returns.reduce((s, r) => s + (r - avg) ** 2, 0) / returns.length) || 1;
    // Entries are stepped one per ~24h (24 1h-bars), so each return is ~daily.
    // Annualize with sqrt(365), not sqrt(365*24) which would treat them as hourly.
    const sharpeRatio = (avg / std) * Math.sqrt(365);

    let peak = equity[0];
    let maxDd = 0;
    for (const e of equity) {
      peak = Math.max(peak, e);
      maxDd = Math.max(maxDd, (peak - e) / peak);
    }

    const grossProfit = trades.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(trades.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0;
    const avgRiskReward = trades.reduce((s, t) => s + t.riskReward, 0) / trades.length;

    const poorMetrics = sharpeRatio < 0.8 || winRatePct < 45;

    return {
      symbol,
      days,
      totalReturnPct: round2(totalReturnPct),
      sharpeRatio: round2(sharpeRatio),
      maxDrawdownPct: round2(maxDd * 100),
      winRatePct: round2(winRatePct),
      avgRiskReward: round2(avgRiskReward),
      profitFactor: round2(profitFactor),
      totalTrades: trades.length,
      poorMetrics,
      confidenceDiscount: poorMetrics ? 20 : 0,
      generatedAt: new Date().toISOString(),
    };
  }

  private async resampleOrFetch(
    symbol: string,
    interval: '4h',
    start: number,
    end: number,
  ): Promise<Kline[]> {
    return this.coindcx.getHistoricalKlines(symbol, interval, start, end);
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
