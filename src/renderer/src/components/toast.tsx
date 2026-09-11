import { useEffect } from "react";
import { X } from "lucide-react";
import {
  useToastStore,
  type ToastItem as ToastItemType,
} from "../stores/toast";

function ToastItem({ item }: { item: ToastItemType }) {
  const remove = useToastStore((s) => s.remove);

  useEffect(() => {
    if (item.duration > 0) {
      const timer = setTimeout(() => remove(item.id), item.duration);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [item.id, item.duration, remove]);

  return (
    <div className="flex w-80 flex-col gap-1 rounded-md bg-white/90 p-3 shadow-md backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{item.title}</span>
        <button
          className="rounded p-0.5 hover:bg-black/5"
          onClick={() => remove(item.id)}
        >
          <X size={14} />
        </button>
      </div>
      <div
        className="text-xs text-gray-600"
        dangerouslySetInnerHTML={{ __html: item.content }}
      />
    </div>
  );
}

export function ToastContainer() {
  const items = useToastStore((s) => s.items);

  if (items.length === 0) return null;

  return (
    <div className="fixed top-14 right-4 z-50 flex flex-col gap-2">
      {items.map((item) => (
        <ToastItem key={item.id} item={item} />
      ))}
    </div>
  );
}
