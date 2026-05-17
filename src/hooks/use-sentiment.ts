"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchFullSentiment } from "@/services/sentiment";
import { useCryptoSettingsStore } from "@/stores/crypto-settings-store";

export function useSentiment() {
  const demoMode = useCryptoSettingsStore((s) => s.demoMode);

  return useQuery({
    queryKey: ["sentiment", demoMode],
    queryFn: () => fetchFullSentiment(demoMode),
    staleTime: 120_000,
    refetchInterval: 180_000,
  });
}
