import { CRYPTO_ALERT_RESCAN_MS } from "@/config/crypto-alerts";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppSettingsState {
  notifications: boolean;
  /** Also alert when this tab is in the foreground (default: only when hidden/minimized). */
  notifyWhenTabVisible: boolean;
  /** Classic Futures tab (/futures) scan + alerts. */
  futuresAlerts: boolean;
  /** Intraday tab (/futures/intraday) scan + alerts. */
  intradayAlerts: boolean;
  /** Background full-scan interval on Futures tab (ms). 0 = off. */
  futuresAlertIntervalMs: number;
  /** Background full-scan interval on Intraday tab (ms). 0 = off. */
  intradayAlertIntervalMs: number;
  setNotifications: (v: boolean) => void;
  setNotifyWhenTabVisible: (v: boolean) => void;
  setFuturesAlerts: (v: boolean) => void;
  setIntradayAlerts: (v: boolean) => void;
  setFuturesAlertIntervalMs: (v: number) => void;
  setIntradayAlertIntervalMs: (v: number) => void;
}

export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set) => ({
      notifications: false,
      notifyWhenTabVisible: false,
      futuresAlerts: true,
      intradayAlerts: true,
      futuresAlertIntervalMs: CRYPTO_ALERT_RESCAN_MS,
      intradayAlertIntervalMs: CRYPTO_ALERT_RESCAN_MS,
      setNotifications: (notifications) => set({ notifications }),
      setNotifyWhenTabVisible: (notifyWhenTabVisible) => set({ notifyWhenTabVisible }),
      setFuturesAlerts: (futuresAlerts) => set({ futuresAlerts }),
      setIntradayAlerts: (intradayAlerts) => set({ intradayAlerts }),
      setFuturesAlertIntervalMs: (futuresAlertIntervalMs) => set({ futuresAlertIntervalMs }),
      setIntradayAlertIntervalMs: (intradayAlertIntervalMs) => set({ intradayAlertIntervalMs }),
    }),
    { name: "meridian-app-settings", skipHydration: true }
  )
);
