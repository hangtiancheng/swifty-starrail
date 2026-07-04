import { useAlertStore } from "@renderer/stores";

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
              {options.cancelText || "Cancel"}
            </button>
          )}
          <button
            className="rounded bg-purple-500 px-3 py-1.5 text-sm text-white hover:bg-purple-600"
            onClick={() => close(true)}
          >
            {options.confirmText || "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
