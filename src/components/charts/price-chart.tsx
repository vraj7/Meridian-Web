"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  ColorType,
} from "lightweight-charts";
import {
  formatChartPrice,
  getChartPriceFormatFromCandles,
} from "@/lib/chart-price";
import type { Candle, TradingSignal } from "@/types";

interface PriceChartProps {
  candles: Candle[];
  signal?: TradingSignal | null;
  height?: number;
}

function priceLineTitle(label: string, price: number, precision: number): string {
  return `${label} ${formatChartPrice(price, precision)}`;
}

/**
 * lightweight-charts requires strictly-ascending, unique `time` values; any
 * duplicate or out-of-order entry (common with 1m/5m feeds that include the
 * currently-forming candle) makes `setData()` throw and leaves the container
 * empty. Normalize defensively before plotting.
 */
function normalizeCandles(candles: Candle[]): Candle[] {
  const byTime = new Map<number, Candle>();
  for (const c of candles) {
    if (!Number.isFinite(c.time) || !Number.isFinite(c.close)) continue;
    byTime.set(c.time, c);
  }
  return Array.from(byTime.values()).sort((a, b) => a.time - b.time);
}

export function PriceChart({ candles, signal, height = 400 }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const safeCandles = normalizeCandles(candles);
    if (safeCandles.length === 0) {
      setRenderError("No candle data available for this timeframe.");
      return;
    }

    const { precision, minMove } = getChartPriceFormatFromCandles(safeCandles);

    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "rgba(148,163,184,0.08)" },
        horzLines: { color: "rgba(148,163,184,0.08)" },
      },
      rightPriceScale: {
        borderVisible: false,
        minimumWidth: 72,
      },
      timeScale: { borderVisible: false },
      localization: {
        priceFormatter: (price: number) => formatChartPrice(price, precision),
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      priceFormat: {
        type: "price",
        precision,
        minMove,
      },
    });

    const data: CandlestickData[] = safeCandles.map((c) => ({
      time: c.time as CandlestickData["time"],
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    try {
      series.setData(data);
      setRenderError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setRenderError(`Chart render failed: ${msg}`);
      chart.remove();
      return;
    }

    if (signal) {
      series.createPriceLine({
        price: signal.stopLoss,
        color: "#ef4444",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: priceLineTitle("SL", signal.stopLoss, precision),
      });
      series.createPriceLine({
        price: signal.takeProfit,
        color: "#22c55e",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: priceLineTitle("TP", signal.takeProfit, precision),
      });
      if (signal.takeProfit2) {
        series.createPriceLine({
          price: signal.takeProfit2,
          color: "#16a34a",
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: priceLineTitle("TP2", signal.takeProfit2, precision),
        });
      }
      if (signal.entryZone?.length === 2) {
        const [zoneLow, zoneHigh] = signal.entryZone;
        series.createPriceLine({
          price: zoneLow,
          color: "#3b82f6",
          lineWidth: 1,
          lineStyle: 3,
          axisLabelVisible: true,
          title: priceLineTitle("Entry", zoneLow, precision),
        });
        series.createPriceLine({
          price: zoneHigh,
          color: "#3b82f6",
          lineWidth: 1,
          lineStyle: 3,
          axisLabelVisible: true,
          title: priceLineTitle("Entry", zoneHigh, precision),
        });
      }
    }

    chart.timeScale().fitContent();
    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize();

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [candles, signal, height]);

  return (
    <div className="relative w-full rounded-lg overflow-hidden bg-card/40" style={{ minHeight: height }}>
      <div ref={containerRef} className="w-full" style={{ minHeight: height }} />
      {renderError && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground p-4 text-center">
          {renderError}
        </div>
      )}
    </div>
  );
}
