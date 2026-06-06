export type ChartInterval = '5m' | '15m' | '1h' | '4h' | '1d';

export const CHART_INTERVAL_CONFIG: Record<
  ChartInterval,
  { resolution: string; secondsPerBar: number; wsSuffix: string; label: string }
> = {
  '5m': { resolution: '5', secondsPerBar: 300, wsSuffix: '5m', label: '5 minute' },
  '15m': { resolution: '15', secondsPerBar: 900, wsSuffix: '15m', label: '15 minute' },
  '1h': { resolution: '60', secondsPerBar: 3_600, wsSuffix: '1h', label: '1 hour' },
  '4h': { resolution: '240', secondsPerBar: 14_400, wsSuffix: '4h', label: '4 hour' },
  '1d': { resolution: '1D', secondsPerBar: 86_400, wsSuffix: '1d', label: 'daily' },
};

/** Next higher timeframe for confirmation. */
export const HIGHER_TIMEFRAME: Record<ChartInterval, ChartInterval | null> = {
  '5m': '15m',
  '15m': '1h',
  '1h': '4h',
  '4h': '1d',
  '1d': null,
};

/** Macro trend context. */
export const MACRO_TIMEFRAME: Record<ChartInterval, ChartInterval | null> = {
  '5m': '1h',
  '15m': '4h',
  '1h': '1d',
  '4h': '1d',
  '1d': null,
};

export function isChartInterval(v: string): v is ChartInterval {
  return v in CHART_INTERVAL_CONFIG;
}

export function intervalLabel(v: ChartInterval): string {
  return CHART_INTERVAL_CONFIG[v].label;
}
