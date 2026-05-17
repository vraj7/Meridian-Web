"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Timeframe } from "@/types";

const CRYPTO_TIMEFRAMES: Timeframe[] = ["1m", "5m", "15m", "1h", "4h", "1D", "1W"];
const INDIA_TIMEFRAMES: Timeframe[] = ["15m", "1h", "4h", "1D", "1W"];

interface MarketSettingsFieldsProps {
  market: "crypto" | "india";
  minConfidence: number;
  defaultTimeframe: Timeframe;
  demoMode: boolean;
  onMinConfidence: (v: number) => void;
  onDefaultTimeframe: (v: Timeframe) => void;
  onDemoMode: (v: boolean) => void;
  relaxedCryptoSignals?: boolean;
  onRelaxedCryptoSignals?: (v: boolean) => void;
  signalLockMinutes?: number;
  onSignalLockMinutes?: (v: number) => void;
}

export function MarketSettingsFields({
  market,
  minConfidence,
  defaultTimeframe,
  demoMode,
  onMinConfidence,
  onDefaultTimeframe,
  onDemoMode,
  relaxedCryptoSignals,
  onRelaxedCryptoSignals,
  signalLockMinutes,
  onSignalLockMinutes,
}: MarketSettingsFieldsProps) {
  const timeframes = market === "crypto" ? CRYPTO_TIMEFRAMES : INDIA_TIMEFRAMES;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Signal engine</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="block text-sm">
          Min confidence: {minConfidence}%
          <input
            type="range"
            min={50}
            max={90}
            value={minConfidence}
            onChange={(e) => onMinConfidence(Number(e.target.value))}
            className="w-full mt-2"
          />
        </label>
        <label className="block text-sm">
          Default timeframe
          <select
            className="w-full mt-1 rounded-md border border-input bg-background p-2 text-sm"
            value={defaultTimeframe}
            onChange={(e) => onDefaultTimeframe(e.target.value as Timeframe)}
          >
            {timeframes.map((tf) => (
              <option key={tf} value={tf}>
                {tf}
              </option>
            ))}
          </select>
        </label>
        {market === "crypto" && onRelaxedCryptoSignals != null && relaxedCryptoSignals != null ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={relaxedCryptoSignals}
              onChange={(e) => onRelaxedCryptoSignals(e.target.checked)}
            />
            Relaxed filters (more spot/futures setups; lower R:R bar)
          </label>
        ) : null}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={demoMode} onChange={(e) => onDemoMode(e.target.checked)} />
          Demo mode (offline mock data)
        </label>
        {market === "crypto" && onSignalLockMinutes != null && signalLockMinutes != null ? (
          <label className="block text-sm">
            Signal stability: {signalLockMinutes} min
            <input
              type="range"
              min={5}
              max={60}
              step={5}
              value={signalLockMinutes}
              onChange={(e) => onSignalLockMinutes(Number(e.target.value))}
              className="w-full mt-2"
            />
            <span className="text-[11px] text-muted-foreground">
              Keeps the same buy/sell label unless conviction changes sharply
            </span>
          </label>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function RefreshSettingsCard({
  refreshInterval,
  onRefreshInterval,
}: {
  refreshInterval: number;
  onRefreshInterval: (ms: number) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Refresh</CardTitle>
      </CardHeader>
      <CardContent>
        <label className="block text-sm">
          Refresh interval (seconds)
          <input
            type="number"
            min={30}
            max={300}
            value={refreshInterval / 1000}
            onChange={(e) => onRefreshInterval(Number(e.target.value) * 1000)}
            className="w-full mt-1 rounded-md border border-input bg-background p-2"
          />
        </label>
      </CardContent>
    </Card>
  );
}
