import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppSettingsState {
  notifications: boolean;
  setNotifications: (v: boolean) => void;
}

export const useAppSettingsStore = create<AppSettingsState>()(
  persist(
    (set) => ({
      notifications: false,
      setNotifications: (notifications) => set({ notifications }),
    }),
    { name: "meridian-app-settings", skipHydration: true }
  )
);
