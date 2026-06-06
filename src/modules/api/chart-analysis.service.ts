import { Injectable } from '@nestjs/common';
import { CoinDcxService } from '../data/coindcx.service';
import { IndicatorsService } from '../indicators/indicators.service';
import { SignalSchedulerService } from '../signal/signal-scheduler.service';
import {
  CHART_INTERVAL_CONFIG,
  intervalLabel,
  type ChartInterval,
} from '../../common/chart-intervals';
import { SignalDirection } from '../../common/types';
import {
  TimeframeSignalService,
  type ChartToolsSnapshot,
  type TimeframeSignalDto,
} from './timeframe-signal.service';

export interface ChartCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartLinePoint {
  time: number;
  value: number;
}

export type TimeframeVerdict = 'CONSIDER' | 'WATCH' | 'WAIT';
export type ActionVerdict = 'TRADE' | 'WATCH' | 'WAIT' | 'AVOID';

export interface TimeframeSummaryItem {
  interval: ChartInterval;
  intervalLabel: string;
  role: string;
  direction: SignalDirection;
  confidence: number;
  weakSignal: boolean;
  trend: string;
  verdict: TimeframeVerdict;
  holdHint: string;
}

export type TradeHorizon = 'auto' | 'scalp' | 'day' | 'swing';

export interface MultiTimeframeActionPlan {
  overallVerdict: ActionVerdict;
  tradeDirection: SignalDirection | null;
  suggestedStyle: string;
  suggestedTimeframe: ChartInterval;
  suggestedTimeframeLabel: string;
  holdWindow: string;
  summary: string;
  steps: string[];
  warnings: string[];
}

export interface MultiTimeframeOverview {
  pair: string;
  label: string;
  horizon: TradeHorizon;
  horizonLabel: string;
  timeframes: TimeframeSummaryItem[];
  alignment: {
    longCount: number;
    shortCount: number;
    neutralCount: number;
    dominantDirection: SignalDirection | 'MIXED';
    macroDirection: SignalDirection;
    swingDirection: SignalDirection;
  };
  actionPlan: MultiTimeframeActionPlan;
}

const OVERVIEW_INTERVALS: ChartInterval[] = ['1d', '4h', '1h', '15m', '5m'];

const TF_ROLE: Record<ChartInterval, string> = {
  '1d': 'Macro bias',
  '4h': 'Swing trend',
  '1h': 'Intraday',
  '15m': 'Entry timing',
  '5m': 'Scalp timing',
};

const TF_HOLD: Record<ChartInterval, string> = {
  '5m': 'Scalp style · often under 2 h',
  '15m': 'Intraday style · often 1–8 h',
  '1h': 'Short swing style · often hours–2 days',
  '4h': 'Swing style · often days, not weeks',
  '1d': 'Position style · often days–weeks (reassess often)',
};

const HORIZON_TFS: Record<Exclude<TradeHorizon, 'auto'>, ChartInterval[]> = {
  scalp: ['5m', '15m'],
  day: ['15m', '1h'],
  swing: ['4h', '1d'],
};

const HORIZON_LABEL: Record<TradeHorizon, string> = {
  auto: 'Auto',
  scalp: 'Scalp (under ~2 h)',
  day: 'Day trade (≤ 24 h)',
  swing: 'Swing (days)',
};

const HORIZON_DEADLINE: Record<Exclude<TradeHorizon, 'auto'>, string> = {
  scalp: 'close within ~2 hours',
  day: 'close before 24 hours',
  swing: 'review daily, hold a few days',
};

const TF_STYLE: Record<ChartInterval, string> = {
  '5m': 'Scalp',
  '15m': 'Intraday',
  '1h': 'Short swing',
  '4h': 'Swing trade',
  '1d': 'Position trade',
};

export interface PlainEnglishAnalysis {
  headline: string;
  verdict: 'WAIT' | 'WATCH' | 'CONSIDER';
  summary: string;
  whenToEnter: string;
  whatTheChartShows: string;
  keyLevels: {
    entry: number;
    marketPrice: number;
    entryKind: 'market' | 'limit';
    entryLabel: string;
    stopLoss: number;
    takeProfit1: number;
    takeProfit2: number;
    label: string;
  };
  risks: string;
  bottomLine: string;
  tools: Record<string, string>;
}

@Injectable()
export class ChartAnalysisService {
  constructor(
    private readonly coindcx: CoinDcxService,
    private readonly indicators: IndicatorsService,
    private readonly scheduler: SignalSchedulerService,
    private readonly timeframeSignal: TimeframeSignalService,
  ) {}

  async getCandles(pairInput: string, interval: ChartInterval = '4h', limit = 300) {
    const pair = this.coindcx.normalizePair(pairInput);
    const klines = await this.coindcx.getKlines(pair, interval, limit);
    const candles: ChartCandle[] = klines.map((k) => ({
      time: Math.floor(k.openTime / 1000),
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
      volume: k.volume,
    }));

    const bb = this.indicators.buildBollingerLines(klines);
    const tf = this.indicators.analyzeTimeframe(klines);

    return {
      pair,
      label: this.coindcx.formatLabel(pair),
      interval,
      candles,
      ema20: this.indicators.buildEmaLine(klines, 20),
      ema50: this.indicators.buildEmaLine(klines, 50),
      ema200: this.indicators.buildEmaLine(klines, 200),
      bollinger: bb,
      support: tf?.support ?? null,
      resistance: tf?.resistance ?? null,
    };
  }

  async getLiveTick(pairInput: string) {
    const pair = this.coindcx.normalizePair(pairInput);
    const quote = await this.coindcx.getLiveQuote(pair);
    return {
      pair,
      label: this.coindcx.formatLabel(pair),
      price: quote.price,
      timestamp: quote.timestamp,
      wsCandleChannel: `${pair}_4h-futures`,
      wsPriceChannel: `${pair}@prices-futures`,
    };
  }

  async getMultiTimeframeOverview(
    pairInput: string,
    horizon: TradeHorizon = 'auto',
  ): Promise<MultiTimeframeOverview> {
    const pair = this.coindcx.normalizePair(pairInput);
    const label = this.coindcx.formatLabel(pair);

    const results = await Promise.all(
      OVERVIEW_INTERVALS.map(async (iv) => {
        const { signal } = await this.timeframeSignal.generate(pair, iv);
        return { interval: iv, signal };
      }),
    );

    const byInterval = new Map(results.map((r) => [r.interval, r.signal]));

    const timeframes: TimeframeSummaryItem[] = OVERVIEW_INTERVALS.map((iv) => {
      const signal = byInterval.get(iv)!;
      return {
        interval: iv,
        intervalLabel: CHART_INTERVAL_CONFIG[iv].label,
        role: TF_ROLE[iv],
        direction: signal.direction,
        confidence: signal.confidence,
        weakSignal: signal.weakSignal,
        trend: signal.trend,
        verdict: this.timeframeVerdict(signal),
        holdHint: TF_HOLD[iv],
      };
    });

    const longCount = timeframes.filter((t) => t.direction === SignalDirection.LONG).length;
    const shortCount = timeframes.filter((t) => t.direction === SignalDirection.SHORT).length;
    const neutralCount = timeframes.filter((t) => t.direction === SignalDirection.NEUTRAL).length;

    let dominantDirection: SignalDirection | 'MIXED' = SignalDirection.NEUTRAL;
    if (longCount >= 3 && shortCount <= 1) dominantDirection = SignalDirection.LONG;
    else if (shortCount >= 3 && longCount <= 1) dominantDirection = SignalDirection.SHORT;
    else if (longCount > shortCount && longCount >= 2) dominantDirection = SignalDirection.LONG;
    else if (shortCount > longCount && shortCount >= 2) dominantDirection = SignalDirection.SHORT;
    else dominantDirection = 'MIXED';

    const daily = byInterval.get('1d')!;
    const h4 = byInterval.get('4h')!;
    const actionPlan = this.buildActionPlan(byInterval, horizon);

    return {
      pair,
      label,
      horizon,
      horizonLabel: HORIZON_LABEL[horizon],
      timeframes,
      alignment: {
        longCount,
        shortCount,
        neutralCount,
        dominantDirection,
        macroDirection: daily.direction,
        swingDirection: h4.direction,
      },
      actionPlan,
    };
  }

  async getAnalysis(pairInput: string, interval: ChartInterval = '4h') {
    const pair = this.coindcx.normalizePair(pairInput);
    const { signal, tools } = await this.timeframeSignal.generate(pair, interval);
    const label = this.coindcx.formatLabel(pair);
    const scanSignal = this.scheduler.getSignal(pair);

    return {
      pair,
      label,
      interval,
      intervalLabel: CHART_INTERVAL_CONFIG[interval].label,
      signal,
      scanSignal: scanSignal ?? null,
      tools,
      analysis: this.buildPlainEnglish(label, signal, tools, interval),
    };
  }

  private buildPlainEnglish(
    label: string,
    signal: TimeframeSignalDto,
    tools: ChartToolsSnapshot,
    interval: ChartInterval,
  ): PlainEnglishAnalysis {
    const tfName = intervalLabel(interval);
    const dir = signal.direction;
    const isLong = dir === SignalDirection.LONG;
    const isShort = dir === SignalDirection.SHORT;

    const trendPlain =
      signal.trend === 'uptrend'
        ? `On the **${tfName}** chart, price is above its short moving averages — trend is **up**.`
        : signal.trend === 'downtrend'
          ? `On the **${tfName}** chart, price is below its moving averages — trend is **down**.`
          : `On the **${tfName}** chart, price is **sideways** — no clear direction.`;

    const rsiPlain =
      tools.rsi >= 70
        ? `RSI is **overbought** at ${tools.rsi} — upside may be tired.`
        : tools.rsi <= 30
          ? `RSI is **oversold** at ${tools.rsi} — downside may be tired.`
          : tools.rsi >= 55
            ? `RSI at ${tools.rsi} shows **mild bullish** pressure.`
            : tools.rsi <= 45
              ? `RSI at ${tools.rsi} shows **mild bearish** pressure.`
              : `RSI at ${tools.rsi} is **neutral**.`;

    const macdPlain =
      tools.macdHistogram > 0
        ? `MACD histogram is **positive** — momentum favours buyers on this timeframe.`
        : tools.macdHistogram < 0
          ? `MACD histogram is **negative** — momentum favours sellers on this timeframe.`
          : `MACD is **flat** on this timeframe.`;

    const adxPlain =
      tools.adx >= 25
        ? `ADX ${tools.adx} — **strong trend** on this chart.`
        : tools.adx >= 18
          ? `ADX ${tools.adx} — **moderate trend**.`
          : `ADX ${tools.adx} — **weak/choppy** — be careful.`;

    const bbPlain =
      tools.bbPosition === 'upper'
        ? `Price is at the **upper Bollinger band** — often resistance or overextension.`
        : tools.bbPosition === 'lower'
          ? `Price is at the **lower Bollinger band** — often support or oversold bounce zone.`
          : `Price is in the **middle of the Bollinger bands**.`;

    const volPlain =
      tools.volumeRatio >= 1.3
        ? `Volume is **rising** (${tools.volumeRatio}x recent average) — moves have conviction.`
        : tools.volumeRatio < 0.8
          ? `Volume is **low** — moves may not stick.`
          : `Volume is **normal**.`;

    const ctxPlain = [
      tools.higherTfTrend ? `Higher timeframe trend: **${tools.higherTfTrend}**.` : null,
      tools.macroTfTrend ? `Macro trend: **${tools.macroTfTrend}**.` : null,
    ]
      .filter(Boolean)
      .join(' ');

    const toolEntries: Record<string, string> = {
      trend: trendPlain,
      rsi: rsiPlain,
      macd: macdPlain,
      adx: adxPlain,
      bollinger: bbPlain,
      volume: volPlain,
      supportResistance: `Recent swing **support** ${this.fmt(tools.support)} · **resistance** ${this.fmt(tools.resistance)}.`,
      context: ctxPlain || 'No higher-timeframe context.',
    };

    const levels = {
      entry: signal.entryPrice,
      marketPrice: signal.marketPrice,
      entryKind: signal.entryKind,
      entryLabel: signal.entryLabel,
      stopLoss: signal.stopLoss,
      takeProfit1: signal.takeProfit1,
      takeProfit2: signal.takeProfit2,
      label,
    };

    const entryPlain =
      signal.entryKind === 'limit'
        ? `**Suggested limit entry:** ~${this.fmt(signal.entryPrice)} (${signal.entryLabel}). **Price now:** ~${this.fmt(signal.marketPrice)}.`
        : `**Entry:** ~${this.fmt(signal.entryPrice)} (market — near current price).`;

    if (dir === SignalDirection.NEUTRAL) {
      return {
        headline: `${label} · ${tfName}: No trade on this chart`,
        verdict: 'WAIT',
        summary: `On the **${tfName}** chart, confidence is **${signal.confidence}%** — not enough to buy or sell here. ${trendPlain}`,
        whenToEnter: `**Wait.** Don't enter on this timeframe until confidence hits **50%+** with trend alignment. Watch for a ${tfName} candle close above ${this.fmt(tools.resistance)} (bullish) or below ${this.fmt(tools.support)} (bearish).`,
        whatTheChartShows: `${trendPlain} ${rsiPlain} ${macdPlain}`,
        keyLevels: levels,
        risks: `${adxPlain} ${signal.notes.join(' ')}`,
        bottomLine: `**No action on ${tfName}.** Switch timeframes or wait for a clearer setup.`,
        tools: toolEntries,
      };
    }

    const action = isLong ? 'BUY (long)' : 'SELL (short)';
    const verdict = signal.weakSignal ? 'WATCH' : 'CONSIDER';

    return {
      headline: `${label} · ${tfName}: ${isLong ? 'Buy' : 'Sell'} — ${signal.confidence}%`,
      verdict,
      summary: `On the **${tfName}** chart, the system suggests **${action}** with **${signal.confidence}%** confidence. ${trendPlain}`,
      whenToEnter: signal.weakSignal
        ? `**Watch first.** Weak ${tfName} setup.\n\n${entryPlain}\n\nEnter only if:\n\n• ${tfName} candle **closes** in your direction\n• Stop loss set at **${this.fmt(signal.stopLoss)}**\n• Higher timeframe agrees (${ctxPlain || 'check 4h/daily'})`
        : `**${tfName} setup looks tradeable.**\n\n${entryPlain}\n\n• **Stop:** ${this.fmt(signal.stopLoss)}\n• **Target 1:** ${this.fmt(signal.takeProfit1)}\n• **Target 2:** ${this.fmt(signal.takeProfit2)}\n\nEnter after ${tfName} candle confirms direction.`,
      whatTheChartShows: `${trendPlain} ${macdPlain} ${rsiPlain} ${bbPlain}`,
      keyLevels: levels,
      risks: [adxPlain, volPlain, signal.weakSignal ? 'Weak signal — size small.' : null, ...signal.notes].filter(Boolean).join(' '),
      bottomLine: signal.weakSignal
        ? `**Cautious ${isLong ? 'buy' : 'sell'} on ${tfName}** — confirm before acting.`
        : tools.rsi <= 30 && isShort
          ? `**Trend is down but RSI is stretched** — prefer waiting for a bounce before shorting on ${tfName}.`
          : tools.rsi >= 70 && isLong
            ? `**Trend is up but RSI is stretched** — prefer waiting for a pullback before buying on ${tfName}.`
            : `**Best ${tfName} setup** — still use stop loss.`,
      tools: toolEntries,
    };
  }

  private timeframeVerdict(signal: TimeframeSignalDto): TimeframeVerdict {
    if (signal.direction === SignalDirection.NEUTRAL) return 'WAIT';
    if (signal.weakSignal) return 'WATCH';
    return 'CONSIDER';
  }

  private hasBias(signal: TimeframeSignalDto): boolean {
    return signal.direction !== SignalDirection.NEUTRAL && signal.confidence >= 50;
  }

  private isActionable(signal: TimeframeSignalDto): boolean {
    return signal.direction !== SignalDirection.NEUTRAL && signal.confidence >= 70 && !signal.weakSignal;
  }

  private buildActionPlan(
    signals: Map<ChartInterval, TimeframeSignalDto>,
    horizon: TradeHorizon = 'auto',
  ): MultiTimeframeActionPlan {
    const daily = signals.get('1d')!;
    const h4 = signals.get('4h')!;
    const h1 = signals.get('1h')!;
    const m15 = signals.get('15m')!;
    const m5 = signals.get('5m')!;
    const all = [daily, h4, h1, m15, m5];

    const warnings: string[] = [];
    const steps: string[] = [];

    for (const s of all) {
      if (s.adx < 12) {
        warnings.push(`${CHART_INTERVAL_CONFIG[s.interval].label} is choppy (ADX ${s.adx.toFixed(0)})`);
      }
      if (s.direction === SignalDirection.SHORT && s.rsi <= 30) {
        warnings.push(
          `${CHART_INTERVAL_CONFIG[s.interval].label} RSI oversold (${s.rsi.toFixed(1)}) — shorting here risks a bounce; wait for a relief rally then re-short`,
        );
      }
      if (s.direction === SignalDirection.LONG && s.rsi >= 70) {
        warnings.push(
          `${CHART_INTERVAL_CONFIG[s.interval].label} RSI overbought (${s.rsi.toFixed(1)}) — chasing longs here risks a pullback`,
        );
      }
    }

    const macroDir = daily.direction;
    const swingDir = h4.direction;
    const intradayDir = h1.direction;
    const macroSwingAgree =
      macroDir !== SignalDirection.NEUTRAL &&
      macroDir === swingDir &&
      this.hasBias(daily) &&
      this.hasBias(h4);

    let overallVerdict: ActionVerdict = 'WAIT';
    let tradeDirection: SignalDirection | null = null;
    let suggestedTimeframe: ChartInterval = '4h';
    let summary = 'No clear setup across timeframes. Stay flat and recheck later.';
    let holdWindow = TF_HOLD['4h'];

    if (
      macroDir !== SignalDirection.NEUTRAL &&
      swingDir !== SignalDirection.NEUTRAL &&
      macroDir !== swingDir
    ) {
      overallVerdict = 'AVOID';
      summary =
        'Daily and 4-hour charts point in opposite directions. No reliable edge — wait until they align.';
      warnings.unshift('Daily vs 4h conflict — highest priority warning.');
      steps.push('Do not enter until daily and 4h show the same direction (both LONG or both SHORT).');
      steps.push('Watch 4h and daily tabs for a breakout that resolves the conflict.');
    } else if (macroSwingAgree) {
      tradeDirection = macroDir;
      const hourlyOk = intradayDir === tradeDirection && this.hasBias(h1);
      const h4Strong = this.isActionable(h4);
      const h1Strong = this.isActionable(h1);

      if (h4Strong || (hourlyOk && this.isActionable(h1))) {
        overallVerdict = 'TRADE';
      } else if (this.hasBias(h4) || hourlyOk) {
        overallVerdict = 'WATCH';
      } else {
        overallVerdict = 'WAIT';
      }

      suggestedTimeframe = h4Strong ? '4h' : h1Strong ? '1h' : '4h';
      if (this.isActionable(m15) && m15.direction === tradeDirection) {
        suggestedTimeframe = '15m';
      } else if (overallVerdict === 'TRADE' && this.hasBias(m15) && m15.direction === tradeDirection) {
        suggestedTimeframe = '15m';
      }

      holdWindow = TF_HOLD[suggestedTimeframe];
      const dirWord = tradeDirection === SignalDirection.LONG ? 'long' : 'short';
      summary =
        overallVerdict === 'TRADE'
          ? `Aligned ${dirWord} bias: daily + 4h agree${hourlyOk ? ', hourly confirms' : ''}. Use the ${CHART_INTERVAL_CONFIG[suggestedTimeframe].label} chart for entry and exits.`
          : overallVerdict === 'WATCH'
            ? `${dirWord.charAt(0).toUpperCase() + dirWord.slice(1)} bias on daily/4h but confirmation is weak. Wait for a stronger hourly or 15m close.`
            : `Daily and 4h lean ${dirWord} but lower timeframes are not confirming yet.`;

      steps.push(`Bias: ${tradeDirection} — daily (${daily.confidence}%) and 4h (${h4.confidence}%) agree.`);
      steps.push(
        `Open the ${CHART_INTERVAL_CONFIG[suggestedTimeframe].label} tab — use its Entry, SL, TP1, TP2 lines.`,
      );
      steps.push(`Trade style: ${holdWindow} — reassess if RSI reverses, SL hits, or lower TF flips.`);

      if (m15.direction !== SignalDirection.NEUTRAL && m15.direction !== tradeDirection) {
        warnings.push('15m is counter-trend — avoid chasing; wait for a pullback or scalp only with tight stop.');
        steps.push('15m disagrees — wait for price to pull back before entering in the macro direction.');
      } else if (m15.direction === tradeDirection && this.hasBias(m15)) {
        steps.push('15m aligns — enter after a 15m candle closes in your direction.');
      }
    } else if (this.hasBias(m15) || this.hasBias(m5)) {
      const entrySignal = this.isActionable(m15)
        ? m15
        : this.isActionable(m5)
          ? m5
          : this.hasBias(m15)
            ? m15
            : m5;
      tradeDirection = entrySignal.direction;
      suggestedTimeframe = entrySignal.interval === '5m' ? '5m' : '15m';
      overallVerdict = this.isActionable(entrySignal) ? 'WATCH' : 'WAIT';
      holdWindow = TF_HOLD[suggestedTimeframe];

      const dirWord = tradeDirection === SignalDirection.LONG ? 'long' : 'short';
      summary =
        macroDir === SignalDirection.NEUTRAL
          ? `Intraday ${dirWord} on ${CHART_INTERVAL_CONFIG[suggestedTimeframe].label} only — no daily bias. Size small.`
          : `Lower-timeframe ${dirWord} setup but daily/4h are not aligned. Treat as ${TF_STYLE[suggestedTimeframe].toLowerCase()} only.`;

      if (macroDir !== SignalDirection.NEUTRAL && macroDir !== tradeDirection) {
        warnings.push(`Intraday ${dirWord} fights daily ${macroDir} bias — high risk.`);
        overallVerdict = 'AVOID';
        summary = `15m/5m say ${dirWord} but daily says ${macroDir}. Counter-trend — avoid or scalp with tight stop only.`;
      }

      steps.push(`Style: ${TF_STYLE[suggestedTimeframe]} — not a multi-day swing.`);
      steps.push(`Use ${CHART_INTERVAL_CONFIG[suggestedTimeframe].label} chart levels only.`);
      steps.push(`Hold within ${holdWindow}, then reassess.`);
    } else {
      steps.push('Wait until daily or 4h confidence reaches 50%+ with trend alignment.');
      steps.push('Click each timeframe row below to inspect individual charts.');
    }

    const swingRsiExhausted =
      tradeDirection === SignalDirection.SHORT &&
      (daily.rsi <= 30 || h4.rsi <= 30);
    const swingRsiOverbought =
      tradeDirection === SignalDirection.LONG &&
      (daily.rsi >= 70 || h4.rsi >= 70);

    if ((swingRsiExhausted || swingRsiOverbought) && overallVerdict === 'TRADE') {
      overallVerdict = 'WATCH';
      const stretch = swingRsiExhausted ? 'oversold — bounce likely before more downside' : 'overbought — pullback likely before more upside';
      summary = `${tradeDirection} bias on higher timeframes but RSI is stretched (${stretch}). Do not chase — wait for mean reversion, then enter on ${CHART_INTERVAL_CONFIG[suggestedTimeframe].label}.`;
      steps.unshift(
        swingRsiExhausted
          ? 'Wait for a relief rally into resistance, then short — not into oversold.'
          : 'Wait for a pullback to support, then long — not into overbought.',
      );
    }

    if (horizon !== 'auto') {
      const band = HORIZON_TFS[horizon];
      // Pick the entry chart within the horizon band that best fits the bias.
      let entryTf = band[0];
      let entrySignal = signals.get(entryTf)!;
      if (tradeDirection) {
        const aligned = band.filter((tf) => signals.get(tf)!.direction === tradeDirection);
        const actionable = aligned.find((tf) => this.isActionable(signals.get(tf)!));
        const biased = aligned.find((tf) => this.hasBias(signals.get(tf)!));
        entryTf = actionable ?? biased ?? aligned[0] ?? band[0];
        entrySignal = signals.get(entryTf)!;
      }

      suggestedTimeframe = entryTf;
      holdWindow = TF_HOLD[entryTf];
      const horizonLabel = HORIZON_LABEL[horizon];
      const deadline = HORIZON_DEADLINE[horizon];
      const entryLabel = CHART_INTERVAL_CONFIG[entryTf].label;

      steps.length = 0;

      if (!tradeDirection) {
        steps.push(`No directional bias right now — no ${horizonLabel} trade.`);
        steps.push(`Watch the ${entryLabel} chart; act only when daily/4h agree and ${entryLabel} confirms.`);
      } else {
        const dirWord = tradeDirection === SignalDirection.LONG ? 'long' : 'short';
        const entryAligned = entrySignal.direction === tradeDirection && this.hasBias(entrySignal);

        steps.push(`Bias: ${tradeDirection} — daily (${daily.confidence}%) and 4h (${h4.confidence}%) set direction.`);
        steps.push(`Trade the ${entryLabel} chart — use its Entry, SL, TP1, TP2 lines (ignore higher-TF levels).`);

        if (entryAligned) {
          steps.push(`Enter ${dirWord} after a ${entryLabel} candle closes in your direction; skip if RSI is stretched (≤30 short / ≥70 long).`);
        } else {
          steps.push(`${entryLabel} is not confirming ${dirWord} yet — wait for it to align before entering.`);
          if (overallVerdict === 'TRADE') overallVerdict = 'WATCH';
        }

        steps.push(`Set SL first. Take partial at TP1; let TP2 run only if time allows.`);
        steps.push(`Hold target: ${holdWindow} — ${deadline}, then exit even if neither TP nor SL hit.`);
      }

      summary = `${horizonLabel}: ${
        tradeDirection
          ? `${tradeDirection} bias — trade the ${entryLabel} chart and ${deadline}.`
          : `no clean setup on the ${entryLabel} chart yet.`
      }`;
    }

    return {
      overallVerdict,
      tradeDirection,
      suggestedStyle: TF_STYLE[suggestedTimeframe],
      suggestedTimeframe,
      suggestedTimeframeLabel: CHART_INTERVAL_CONFIG[suggestedTimeframe].label,
      holdWindow,
      summary,
      steps,
      warnings,
    };
  }

  private fmt(n: number): string {
    if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
    if (n >= 1) return n.toFixed(4);
    return n.toFixed(6);
  }
}
