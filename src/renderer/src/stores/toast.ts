import { create } from "zustand";

export interface ToastItem {
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
