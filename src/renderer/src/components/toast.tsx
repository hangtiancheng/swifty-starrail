import { create } from "zustand";
import { X } from "lucide-react";
import { useEffect } from "react";

interface ToastItem {
  id: number;
  title: string;
  content: string;
  duration: number;
}

interface ToastState {
  items: ToastItem[];
  add: (title: string, content: string, duration?: number) => void;
  remove: (id: number) => void;
}

let nextId = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  items: [],
  add: (title, content, duration = 5000) => {
    const id = nextId++;
    set({ items: [...get().items, { id, title, content, duration }] });
  },
  remove: (id) => {
    set({ items: get().items.filter((t) => t.id !== id) });
  },
}));

export const toast = {
  info: (title: string, content: string, duration?: number) => {
    useToastStore.getState().add(title, content, duration);
  },
};

function ToastItem({ item }: { item: ToastItem }) {
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
