"use client";

import { useEffect } from "react";
import { migrateLegacySettings } from "@/lib/migrate-legacy-settings";
import { useActiveSignalsStore } from "@/stores/active-signals-store";
import { useAppSettingsStore } from "@/stores/app-settings-store";
import { useCryptoSettingsStore } from "@/stores/crypto-settings-store";
import { useIndiaSettingsStore } from "@/stores/india-settings-store";
import { usePortfolioStore } from "@/stores/portfolio-store";
import { useSignalHistoryStore } from "@/stores/signal-history-store";
import { useWatchlistStore } from "@/stores/watchlist-store";

/** Rehydrate persisted Zustand stores only on the client (avoids hydration mismatch). */
export function StoreRehydration() {
  useEffect(() => {
    migrateLegacySettings();
    void useCryptoSettingsStore.persist.rehydrate();
    void useIndiaSettingsStore.persist.rehydrate();
    void useAppSettingsStore.persist.rehydrate();
    void useWatchlistStore.persist.rehydrate();
    void usePortfolioStore.persist.rehydrate();
    void useSignalHistoryStore.persist.rehydrate();
    void useActiveSignalsStore.persist.rehydrate();
  }, []);
  return null;
}
