import { create } from "zustand";
import type { AppSettings } from "../../../shared/ipc-schema";

interface SettingsState {
  settings: AppSettings | null;
  load: () => Promise<void>;
  update: (key: string, value: unknown) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,

  load: async () => {
    const settings = await window.api.invoke("setting:getAppSettings");
    set({ settings });
  },

  update: async (key, value) => {
    const settings = await window.api.invoke(
      "setting:setAppSettings",
      key,
      value,
    );
    set({ settings });
  },
}));
