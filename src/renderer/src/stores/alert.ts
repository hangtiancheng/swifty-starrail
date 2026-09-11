import { create } from "zustand";

export interface AlertOptions {
  title: string;
  content: string;
  confirmText?: string;
  cancelText?: string;
}

interface AlertState {
  visible: boolean;
  options: AlertOptions;
  resolve: ((confirmed: boolean) => void) | null;
  show: (options: AlertOptions) => Promise<boolean>;
  close: (confirmed: boolean) => void;
}

export const useAlertStore = create<AlertState>((set, get) => ({
  visible: false,
  options: { title: "", content: "" },
  resolve: null,

  show: (options) => {
    return new Promise<boolean>((resolve) => {
      set({ visible: true, options, resolve });
    });
  },

  close: (confirmed) => {
    const { resolve } = get();
    resolve?.(confirmed);
    set({ visible: false, resolve: null });
  },
}));

export const alert = {
  confirm: (options: AlertOptions) => useAlertStore.getState().show(options),
};
