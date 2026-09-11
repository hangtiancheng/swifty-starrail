import { create } from "zustand";

interface TextMapState {
  textMap: Record<string, string> | null;
  loadTextMap: (fileName: string) => Promise<void>;
  getText: (hash: string) => string;
}

export const useTextMapStore = create<TextMapState>((set, get) => ({
  textMap: null,

  loadTextMap: async (fileName) => {
    const data = (await window.api.invoke(
      "static:loadJson",
      fileName,
    )) as Record<string, string>;
    set({ textMap: data });
  },

  getText: (hash) => {
    return get().textMap?.[hash] ?? "";
  },
}));
