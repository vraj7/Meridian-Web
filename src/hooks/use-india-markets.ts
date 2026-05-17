"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchIndiaStocks } from "@/services/india/india-markets";
import { useIndiaSettingsStore } from "@/stores/india-settings-store";

export function useIndiaMarkets() {
  const demoMode = useIndiaSettingsStore((s) => s.demoMode);
  const refreshInterval = useIndiaSettingsStore((s) => s.refreshInterval);

  return useQuery({
    queryKey: ["india-markets", demoMode],
    queryFn: () => fetchIndiaStocks(demoMode),
    refetchInterval: refreshInterval,
    staleTime: 45_000,
  });
}
