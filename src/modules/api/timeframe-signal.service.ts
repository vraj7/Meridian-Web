import { Injectable } from '@nestjs/common';
import { CoinDcxService } from '../data/coindcx.service';
import { IndicatorsService } from '../indicators/indicators.service';
import {
  CHART_INTERVAL_CONFIG,
  HIGHER_TIMEFRAME,
  MACRO_TIMEFRAME,
  intervalLabel,
  type ChartInterval,
} from '../../common/chart-intervals';
import { SignalDirection } from '../../common/types';

export interface TimeframeSignalDto {
  interval: ChartInterval;
  intervalLabel: string;
  direction: SignalDirection;
  confidence: number;
  rawConfidence: number;
  weakSignal: boolean;
  entryPrice: number;
  marketPrice: number;
  entryKind: 'market' | 'limit';
  entryLabel: string;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  riskReward1: number;
  riskReward2: number;
  trend: string;
  adx: number;
  rsi: number;
  macdHistogram: number;
  components: Record<string, number>;
  notes: string[];
  support: number;
  resistance: number;
}

export interface ChartToolsSnapshot {
  rsi: number;
  macdHistogram: number;
  adx: number;
  ema20: number;
  ema50: number;
  bbUpper: number;
  bbLower: number;
  bbPosition: string;
  volumeRatio: number;
  support: number;
  resistance: number;
  higherTfTrend: string | null;
  macroTfTrend: string | null;
}

@Injectable()
export class TimeframeSignalService {
  constructor(
    private readonly coindcx: CoinDcxService,
    private readonly indicators: IndicatorsService,
  ) {}

  async generate(pairInput: string, interval: ChartInterval): Promise<{
    signal: TimeframeSignalDto;
    tools: ChartToolsSnapshot;
  }> {
    const pair = this.coindcx.normalizePair(pairInput);
    const klines = await this.coindcx.getKlines(pair, interval, 300);
    const tf = this.indicators.analyzeTimeframe(klines);
    if (!tf) {
      throw new Error(`Not enough data for ${interval} chart`);
    }

    const higherKey = HIGHER_TIMEFRAME[interval];
    const macroKey = MACRO_TIMEFRAME[interval];
    const higherKlines = higherKey ? await this.coindcx.getKlines(pair, higherKey, 250) : [];
    const macroKlines = macroKey && macroKey !== higherKey ? await this.coindcx.getKlines(pair, macroKey, 250) : higherKlines;

    const higherTf = higherKlines.length ? this.indicators.analyzeTimeframe(higherKlines) : null;
    const macroTf = macroKlines.length ? this.indicators.analyzeTimeframe(macroKlines) : null;

    const scores = this.indicators.scoreTimeframe(tf, higherTf, macroTf);
    const side = scores.longScore >= scores.shortScore ? 'long' : 'short';
    let rawConfidence = Math.max(scores.longScore, scores.shortScore);
    const components = side === 'long' ? scores.longComponents : scores.shortComponents;
    const notes: string[] = [];

    const threshold = 70;
    const weakMin = 50;
    let direction = SignalDirection.NEUTRAL;

    const trendAligned =
      (side === 'long' && tf.trend === 'uptrend') ||
      (side === 'short' && tf.trend === 'downtrend');

    if (rawConfidence >= threshold && trendAligned) {
      direction = side === 'long' ? SignalDirection.LONG : SignalDirection.SHORT;
    } else if (rawConfidence >= weakMin && trendAligned) {
      direction = side === 'long' ? SignalDirection.LONG : SignalDirection.SHORT;
      notes.push(`Weak ${intervalLabel(interval)} setup — wait for confirmation`);
    } else if (rawConfidence >= weakMin && !trendAligned) {
      direction = SignalDirection.NEUTRAL;
      notes.push(`${side.toUpperCase()} idea blocked — ${intervalLabel(interval)} trend not aligned`);
      rawConfidence = side === 'long' ? scores.longScore : scores.shortScore;
    } else {
      direction = SignalDirection.NEUTRAL;
      notes.push(`No clear ${intervalLabel(interval)} edge — stay flat`);
    }

    if (tf.adx < 12) {
      direction = SignalDirection.NEUTRAL;
      notes.push(`ADX too low (${tf.adx.toFixed(0)}) — choppy on this timeframe`);
      rawConfidence = Math.min(rawConfidence, 45);
    }

    if (direction === SignalDirection.SHORT && tf.rsi <= 30) {
      notes.push(`RSI oversold (${tf.rsi.toFixed(1)}) — bounce risk; chasing shorts here is dangerous`);
      if (tf.bbPosition === 'lower') {
        notes.push('Price at lower Bollinger band — often a mean-reversion bounce zone');
      }
      rawConfidence = Math.min(rawConfidence, 65);
    } else if (direction === SignalDirection.LONG && tf.rsi >= 70) {
      notes.push(`RSI overbought (${tf.rsi.toFixed(1)}) — pullback risk before chasing longs`);
      if (tf.bbPosition === 'upper') {
        notes.push('Price at upper Bollinger band — often a mean-reversion pullback zone');
      }
      rawConfidence = Math.min(rawConfidence, 65);
    }

    const marketPrice = (await this.coindcx.getOrderBookMid(pair).catch(() => tf.price)) || tf.price;
    const slSide =
      direction === SignalDirection.SHORT
        ? 'short'
        : direction === SignalDirection.LONG
          ? 'long'
          : side;
    const suggested = this.indicators.computeSuggestedEntry(tf, slSide, marketPrice);
    const entry = suggested.price;
    const levels = this.indicators.computeSlTpFromAtr(klines, entry, slSide, tf.atr);

    const confidence = Math.round(rawConfidence);
    const weakSignal = direction !== SignalDirection.NEUTRAL && confidence < threshold;

    const tools: ChartToolsSnapshot = {
      rsi: Math.round(tf.rsi * 10) / 10,
      macdHistogram: Math.round(tf.macdHistogram * 1e6) / 1e6,
      adx: Math.round(tf.adx * 10) / 10,
      ema20: tf.ema20,
      ema50: tf.ema50,
      bbUpper: tf.bbUpper,
      bbLower: tf.bbLower,
      bbPosition: tf.bbPosition,
      volumeRatio: Math.round(tf.volumeRatio * 100) / 100,
      support: tf.support,
      resistance: tf.resistance,
      higherTfTrend: higherTf?.trend ?? null,
      macroTfTrend: macroTf?.trend ?? null,
    };

    return {
      signal: {
        interval,
        intervalLabel: CHART_INTERVAL_CONFIG[interval].label,
        direction,
        confidence,
        rawConfidence: Math.round(rawConfidence),
        weakSignal,
        entryPrice: entry,
        marketPrice,
        entryKind: suggested.kind,
        entryLabel: suggested.label,
        stopLoss: levels.stopLoss,
        takeProfit1: levels.takeProfit1,
        takeProfit2: levels.takeProfit2,
        riskReward1: levels.riskReward1,
        riskReward2: levels.riskReward2,
        trend: tf.trend,
        adx: tf.adx,
        rsi: tf.rsi,
        macdHistogram: tf.macdHistogram,
        components,
        notes,
        support: tf.support,
        resistance: tf.resistance,
      },
      tools,
    };
  }
}
