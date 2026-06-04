import { create } from "zustand";

interface AlertOptions {
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

export function AlertDialog() {
  const { visible, options, close } = useAlertStore();

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-80 rounded-lg bg-white p-5 shadow-lg">
        <h3 className="mb-2 text-base font-medium">{options.title}</h3>
        <p className="mb-4 text-sm text-gray-600">{options.content}</p>
        <div className="flex justify-end gap-2">
          {options.cancelText !== undefined && (
            <button
              className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
              onClick={() => close(false)}
            >
              {options.cancelText || "取消"}
            </button>
          )}
          <button
            className="rounded bg-purple-500 px-3 py-1.5 text-sm text-white hover:bg-purple-600"
            onClick={() => close(true)}
          >
            {options.confirmText || "确认"}
          </button>
        </div>
      </div>
    </div>
  );
}
