"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchBtcDominance, fetchTop50Markets } from "@/services/markets";
import { useCryptoSettingsStore } from "@/stores/crypto-settings-store";

export function useMarkets() {
  const demoMode = useCryptoSettingsStore((s) => s.demoMode);
  const refreshInterval = useCryptoSettingsStore((s) => s.refreshInterval);

  return useQuery({
    queryKey: ["markets", "delta-futures", demoMode],
    queryFn: () => fetchTop50Markets(demoMode),
    refetchInterval: refreshInterval,
    staleTime: 30_000,
  });
}

export function useBtcDominance() {
  const demoMode = useCryptoSettingsStore((s) => s.demoMode);

  return useQuery({
    queryKey: ["btc-dominance", demoMode],
    queryFn: () => fetchBtcDominance(demoMode),
    staleTime: 120_000,
    refetchInterval: 120_000,
  });
}
