import { create } from "zustand";

interface AchievementState {
  uids: Record<string, string> | null;
  currentUid: string | null;
  currentData: Record<string, unknown> | null;
  headInfo: string;
  selectedSeries: number;
  searchString: string;

  init: () => Promise<void>;
  setCurrentUid: (uid: string) => Promise<void>;
  setStatus: (ids: string[], status: number) => Promise<void>;
  newUser: (uid: string, nickname: string) => Promise<{ msg: string }>;
  deleteUser: (uid: string) => Promise<{ msg: string }>;
  importData: (type: string) => Promise<{ msg: string }>;
  exportData: (type: string) => Promise<{ msg: string }>;
  setHeadInfo: (info: string) => void;
  setSelectedSeries: (id: number) => void;
  setSearchString: (s: string) => void;
}

export const useAchievementStore = create<AchievementState>((set, get) => ({
  uids: null,
  currentUid: null,
  currentData: null,
  headInfo: "Loading",
  selectedSeries: 0,
  searchString: "",

  init: async () => {
    const uidsResult = await window.api.invoke("achievement:getUids");
    if (uidsResult.msg !== "OK") return;
    const uids = "data" in uidsResult ? uidsResult.data : null;
    const settings = await window.api.invoke("setting:getAppSettings");
    const uid = settings.LastAchievementUid;
    const dataResult = await window.api.invoke("achievement:getData", uid);
    const data =
      dataResult.msg === "OK" && "data" in dataResult ? dataResult.data : null;
    set({
      uids,
      currentUid: uid,
      currentData: data as Record<string, unknown>,
    });
  },

  setCurrentUid: async (uid) => {
    if (uid === get().currentUid) return;
    const result = await window.api.invoke("achievement:getData", uid, true);
    if (result.msg === "OK" && "data" in result) {
      set({
        currentUid: uid,
        currentData: result.data as Record<string, unknown>,
      });
    }
  },

  setStatus: async (ids, status) => {
    const { currentUid } = get();
    if (!currentUid) return;
    const result = await window.api.invoke(
      "achievement:setStatus",
      currentUid,
      ids,
      status,
    );
    if (result.msg === "OK") {
      const dataResult = await window.api.invoke(
        "achievement:getData",
        currentUid,
      );
      if (dataResult.msg === "OK" && "data" in dataResult) {
        set({ currentData: dataResult.data as Record<string, unknown> });
      }
    }
  },

  newUser: async (uid, nickname) => {
    const result = await window.api.invoke(
      "achievement:newData",
      uid,
      nickname,
    );
    if (result.msg === "OK") {
      const uids = { ...get().uids, [uid]: nickname };
      const dataResult = await window.api.invoke(
        "achievement:getData",
        uid,
        true,
      );
      const data =
        dataResult.msg === "OK" && "data" in dataResult ? dataResult.data : {};
      set({
        uids,
        currentUid: uid,
        currentData: data as Record<string, unknown>,
      });
    }
    return result;
  },

  deleteUser: async (uid) => {
    const result = await window.api.invoke("achievement:delData", uid);
    if (result.msg === "OK") {
      const uids = { ...get().uids };
      delete uids[uid];
      const nextUid = Object.keys(uids)[0];
      const dataResult = await window.api.invoke(
        "achievement:getData",
        nextUid,
        true,
      );
      const data =
        dataResult.msg === "OK" && "data" in dataResult ? dataResult.data : {};
      set({
        uids,
        currentUid: nextUid,
        currentData: data as Record<string, unknown>,
      });
    }
    return result;
  },

  importData: async (type) => {
    const { currentUid } = get();
    if (!currentUid) return { msg: "No UID" };
    const result = await window.api.invoke(
      "achievement:importData",
      currentUid,
      type,
    );
    if (result.msg === "OK") {
      const dataResult = await window.api.invoke(
        "achievement:getData",
        currentUid,
      );
      if (dataResult.msg === "OK" && "data" in dataResult) {
        set({ currentData: dataResult.data as Record<string, unknown> });
      }
    }
    return result;
  },

  exportData: async (type) => {
    const { currentUid } = get();
    if (!currentUid) return { msg: "No UID" };
    return await window.api.invoke("achievement:exportData", currentUid, type);
  },

  setHeadInfo: (info) => set({ headInfo: info }),
  setSelectedSeries: (id) => set({ selectedSeries: id }),
  setSearchString: (s) => set({ searchString: s }),
}));
