import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { SignalEntity } from '../../entities';
import { IndicatorsService } from '../indicators/indicators.service';
import { OiHistoryService } from '../data/oi-history.service';
import { MarketContextService } from '../data/market-context.service';
import { AppLogger } from '../../common/logger/app.logger';
import {
  SignalDirection,
  type PairMarketData,
  type SignalComponents,
  type TradingSignalDto,
} from '../../common/types';

@Injectable()
export class SignalEngineService {
  private backtestDiscounts = new Map<string, number>();

  constructor(
    private readonly indicators: IndicatorsService,
    private readonly oiHistory: OiHistoryService,
    private readonly marketContext: MarketContextService,
    private readonly config: ConfigService,
    private readonly logger: AppLogger,
    @InjectRepository(SignalEntity)
    private readonly signalRepo: Repository<SignalEntity>,
  ) {}

  setBacktestDiscount(symbol: string, discountPct: number): void {
    this.backtestDiscounts.set(symbol, discountPct);
  }

  async generateSignal(data: PairMarketData, marketCtx?: Awaited<ReturnType<MarketContextService['getMarketContext']>>): Promise<TradingSignalDto> {
    const ctx = marketCtx ?? (await this.marketContext.getMarketContext());
    const trend = this.indicators.analyzeDailyTrend(data.klines1d);
    const momentum = this.indicators.analyze4hMomentum(data.klines4h);
    const oiChangePct = this.oiHistory.getOiChangePct(data.oiHistory);
    const entry = data.orderBookMid;

    const notes: string[] = [];
    let adxPenalty = 0;
    if (trend.adx < 15) {
      return this.neutralSignal(data.symbol, entry, trend, notes, 'ADX < 15 — choppy market');
    }
    if (trend.adx < 20) {
      adxPenalty = 6;
      notes.push(`Low ADX (${trend.adx.toFixed(0)}) — confidence reduced`);
    }

    const longScore = this.buildScore(data, trend, momentum, oiChangePct, ctx, 'long', notes, adxPenalty);
    const shortScore = this.buildScore(data, trend, momentum, oiChangePct, ctx, 'short', notes, adxPenalty);

    let direction = SignalDirection.NEUTRAL;
    let rawConfidence = Math.max(longScore.total, shortScore.total);
    let components = longScore.total >= shortScore.total ? longScore.components : shortScore.components;
    let side: 'long' | 'short' = longScore.total >= shortScore.total ? 'long' : 'short';

    const threshold = this.config.get<number>('app.signalConfidenceThreshold', 70);
    const weakMin = this.config.get<number>('app.weakSignalMin', 50);

    let trendBlocked = false;
    if (side === 'long' && trend.trend !== 'uptrend') {
      if (longScore.total < threshold + 10) {
        trendBlocked = true;
        direction = SignalDirection.NEUTRAL;
        notes.push('LONG blocked — daily not uptrend');
        rawConfidence = longScore.total;
        components = longScore.components;
      }
    }
    if (side === 'short' && trend.trend !== 'downtrend') {
      if (shortScore.total < threshold + 10) {
        trendBlocked = true;
        direction = SignalDirection.NEUTRAL;
        notes.push('SHORT blocked — daily not downtrend');
        rawConfidence = shortScore.total;
        components = shortScore.components;
      }
    }

    if (!trendBlocked) {
      const trendAligned =
        (side === 'long' && trend.trend === 'uptrend') ||
        (side === 'short' && trend.trend === 'downtrend');

      if (rawConfidence >= threshold) {
        if (trendAligned || rawConfidence >= threshold + 10) {
          direction = side === 'long' ? SignalDirection.LONG : SignalDirection.SHORT;
        } else {
          direction = SignalDirection.NEUTRAL;
          notes.push(`${side.toUpperCase()} blocked — trend not aligned`);
        }
      } else if (rawConfidence >= weakMin) {
        if (trendAligned) {
          direction = side === 'long' ? SignalDirection.LONG : SignalDirection.SHORT;
          notes.push('WEAK signal — confidence 50–69');
        } else {
          direction = SignalDirection.NEUTRAL;
          notes.push('Weak setup blocked — trend not aligned');
        }
      } else {
        direction = SignalDirection.NEUTRAL;
      }
    }

    const discount = this.backtestDiscounts.get(data.symbol) ?? 0;
    let confidence = Math.round(Math.max(0, Math.min(100, rawConfidence - discount)));

    if (data.liquidations.length > 0) {
      confidence = Math.round(confidence * 0.8);
      notes.push('Near liquidation cluster — confidence reduced 20%');
      if (confidence < threshold) direction = SignalDirection.NEUTRAL;
    }

    const weakSignal = direction !== SignalDirection.NEUTRAL && confidence < threshold;
    if (weakSignal && !notes.some((n) => n.includes('WEAK'))) {
      notes.push('Logged as weak — do not act');
    }

    const slSide =
      direction === SignalDirection.SHORT
        ? 'short'
        : direction === SignalDirection.LONG
          ? 'long'
          : trend.trend === 'downtrend'
            ? 'short'
            : trend.trend === 'uptrend'
              ? 'long'
              : side;
    const { stopLoss, takeProfit1, takeProfit2, riskReward1, riskReward2 } =
      this.indicators.computeSlTp(data.klines1h, entry, slSide, trend.atrRatio);

    return {
      symbol: data.symbol,
      pair: data.symbol,
      direction,
      confidence,
      rawConfidence: Math.round(rawConfidence),
      weakSignal,
      entryPrice: entry,
      stopLoss,
      takeProfit1,
      takeProfit2,
      riskReward1,
      riskReward2,
      dailyTrend: trend.trend,
      adxDaily: trend.adx,
      atrRatio: trend.atrRatio,
      components,
      notes,
      generatedAt: new Date().toISOString(),
    };
  }

  async persistSignal(signal: TradingSignalDto): Promise<void> {
    if (signal.direction === SignalDirection.NEUTRAL) return;
    await this.signalRepo.save({
      symbol: signal.symbol,
      direction: signal.direction,
      confidence: signal.confidence,
      rawConfidence: signal.rawConfidence,
      weakSignal: signal.weakSignal,
      entryPrice: signal.entryPrice,
      stopLoss: signal.stopLoss,
      takeProfit1: signal.takeProfit1,
      takeProfit2: signal.takeProfit2,
      riskReward1: signal.riskReward1,
      riskReward2: signal.riskReward2,
      components: signal.components as unknown as Record<string, number>,
      notes: signal.notes,
    });
  }

  private buildScore(
    data: PairMarketData,
    trend: ReturnType<IndicatorsService['analyzeDailyTrend']>,
    momentum: ReturnType<IndicatorsService['analyze4hMomentum']>,
    oiChangePct: number,
    ctx: Awaited<ReturnType<MarketContextService['getMarketContext']>>,
    direction: 'long' | 'short',
    notes: string[],
    adxPenalty = 0,
  ): { total: number; components: SignalComponents } {
    const cvd = this.indicators.scoreCvdForDirection(data.cvd, direction);
    const components: SignalComponents = {
      dailyTrend: this.indicators.scoreDailyTrendAlignment(trend.trend, direction),
      momentum4h: this.indicators.score4hMomentum(momentum, direction),
      cvdDivergence: cvd.score,
      oiChange: this.indicators.scoreOiChange(oiChangePct, direction),
      funding: this.indicators.scoreFunding(data.fundingRate, data.fundingRateAvg30d, direction),
      newsSentiment: this.indicators.scoreNews(data.newsPositive, data.newsNegative, direction),
      volatilityPenalty: this.indicators.volatilityPenalty(trend.atrRatio),
      fearGreed: 0,
      btcDominance: 0,
      liquidationPenalty: 0,
      backtestDiscount: 0,
    };

    if (direction === 'long' && ctx.fearGreedIndex < 25) components.fearGreed = 5;
    if (direction === 'short' && ctx.fearGreedIndex > 75) components.fearGreed = 5;
    if (direction === 'long' && ctx.fearGreedIndex > 75) components.fearGreed = -5;
    if (direction === 'short' && ctx.fearGreedIndex < 25) components.fearGreed = 3;

    if (ctx.btcDominanceChange24h > 0.3 && direction === 'long' && !data.symbol.includes('BTC')) {
      components.btcDominance = -5;
      notes.push('BTC dominance rising — alt LONG penalized');
    }
    if (ctx.btcDominanceChange24h > 0.3 && direction === 'short' && !data.symbol.includes('BTC')) {
      components.btcDominance = 3;
    }

    const total =
      components.dailyTrend +
      components.momentum4h +
      components.cvdDivergence +
      components.oiChange +
      components.funding +
      components.newsSentiment +
      components.volatilityPenalty +
      components.fearGreed +
      components.btcDominance -
      adxPenalty;

    return { total: Math.max(0, total), components };
  }

  private neutralSignal(
    symbol: string,
    entry: number,
    trend: ReturnType<IndicatorsService['analyzeDailyTrend']>,
    notes: string[],
    reason: string,
  ): TradingSignalDto {
    notes.push(reason);
    const { stopLoss, takeProfit1, takeProfit2, riskReward1, riskReward2 } =
      this.indicators.computeSlTp(
        trend.adx ? [{ high: entry, low: entry, open: entry, close: entry, volume: 0, openTime: 0, closeTime: 0 }] : [],
        entry,
        'long',
        trend.atrRatio,
      );

    return {
      symbol,
      pair: symbol,
      direction: SignalDirection.NEUTRAL,
      confidence: 0,
      rawConfidence: 0,
      weakSignal: false,
      entryPrice: entry,
      stopLoss,
      takeProfit1,
      takeProfit2,
      riskReward1,
      riskReward2,
      dailyTrend: trend.trend,
      adxDaily: trend.adx,
      atrRatio: trend.atrRatio,
      components: {
        dailyTrend: 0,
        momentum4h: 0,
        cvdDivergence: 0,
        oiChange: 0,
        funding: 0,
        newsSentiment: 0,
        volatilityPenalty: 0,
        fearGreed: 0,
        btcDominance: 0,
        liquidationPenalty: 0,
        backtestDiscount: 0,
      },
      notes,
      generatedAt: new Date().toISOString(),
    };
  }
}
