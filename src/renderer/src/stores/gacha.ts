import { create } from "zustand";
import { useTextMapStore } from "./text-map";

type AvatarConfig = Record<string, Record<string, unknown>>;
type EquipmentConfig = Record<string, Record<string, unknown>>;
type GachaRecord = Record<string, Record<string, string>>;

interface GachaState {
  avatarConfig: AvatarConfig | null;
  lightConeConfig: EquipmentConfig | null;
  gachaPoolInfo: unknown;
  gachaBasicInfo: unknown;
  uids: Record<string, string> | null;
  currentUid: string | null;
  currentData: GachaRecord | null;
  viewMode: "pool" | "type";

  init: () => Promise<void>;
  setCurrentUid: (uid: string) => Promise<void>;
  newUser: (uid: string, nickname: string) => Promise<{ msg: string }>;
  deleteUser: (uid: string) => Promise<{ msg: string }>;
  refreshData: (type: string, data?: unknown) => Promise<{ msg: string }>;
  importData: (type: string) => Promise<{ msg: string }>;
  exportData: (type: string, uids?: string[]) => Promise<{ msg: string }>;
  getGachaURL: (
    server?: "cn" | "global",
  ) => Promise<{ msg: string; data?: { url: string } }>;
  getItemStar: (itemId: string | number) => number;
  getItemName: (itemId: string | number) => string;
  setViewMode: (mode: "pool" | "type") => void;
}

let itemStarCache: Record<string, number> = {};
let itemNameHashCache: Record<string, string> = {};

export const useGachaStore = create<GachaState>((set, get) => ({
  avatarConfig: null,
  lightConeConfig: null,
  gachaPoolInfo: null,
  gachaBasicInfo: null,
  uids: null,
  currentUid: null,
  currentData: null,
  viewMode: "pool",

  init: async () => {
    const [avatar, avatarLD, lightCone, poolInfo, basicInfo] =
      await Promise.all([
        window.api.invoke("static:loadJson", "AvatarConfig"),
        window.api.invoke("static:loadJson", "AvatarConfigLD"),
        window.api.invoke("static:loadJson", "EquipmentConfig"),
        window.api.invoke("static:loadJson", "GachaPoolInfo"),
        window.api.invoke("static:loadJson", "GachaBasicInfo"),
      ]);
    const avatarConfig = {
      ...(avatar as AvatarConfig),
      ...(avatarLD as AvatarConfig),
    };
    const lightConeConfig = lightCone as EquipmentConfig;

    const uidsResult = await window.api.invoke("gacha:getUids");
    const uids =
      uidsResult.msg === "OK" && "data" in uidsResult ? uidsResult.data : null;
    const settings = await window.api.invoke("setting:getAppSettings");
    const uid = settings.LastGachaUid;
    const dataResult = await window.api.invoke("gacha:getData", uid);
    const data =
      dataResult.msg === "OK" && "data" in dataResult ? dataResult.data : null;

    itemStarCache = {};
    itemNameHashCache = {};
    set({
      avatarConfig,
      lightConeConfig: lightConeConfig,
      gachaPoolInfo: poolInfo,
      gachaBasicInfo: basicInfo,
      uids,
      currentUid: uid,
      currentData: data as GachaRecord,
    });
  },

  setCurrentUid: async (uid) => {
    if (uid === get().currentUid) return;
    const result = await window.api.invoke("gacha:getData", uid, true);
    if (result.msg === "OK" && "data" in result) {
      set({ currentUid: uid, currentData: result.data as GachaRecord });
    }
  },

  newUser: async (uid, nickname) => {
    const result = await window.api.invoke("gacha:newData", uid, nickname);
    if (result.msg === "OK") {
      const uids = { ...get().uids, [uid]: nickname };
      const dataResult = await window.api.invoke("gacha:getData", uid, true);
      const data =
        dataResult.msg === "OK" && "data" in dataResult ? dataResult.data : {};
      set({ uids, currentUid: uid, currentData: data as GachaRecord });
    }
    return result;
  },

  deleteUser: async (uid) => {
    const result = await window.api.invoke("gacha:delData", uid);
    if (result.msg === "OK") {
      const uids = { ...get().uids };
      delete uids[uid];
      const nextUid = Object.keys(uids)[0];
      const dataResult = await window.api.invoke(
        "gacha:getData",
        nextUid,
        true,
      );
      const data =
        dataResult.msg === "OK" && "data" in dataResult ? dataResult.data : {};
      set({ uids, currentUid: nextUid, currentData: data as GachaRecord });
    }
    return result;
  },

  refreshData: async (type, data) => {
    const result = await window.api.invoke(
      "gacha:importData",
      type,
      data as object,
    );
    if (result.msg === "OK" && "data" in result) {
      const uidsResult = await window.api.invoke("gacha:getUids");
      const uids =
        uidsResult.msg === "OK" && "data" in uidsResult
          ? uidsResult.data
          : get().uids;
      const uid = result.data.uid;
      const dataResult = await window.api.invoke("gacha:getData", uid);
      const gachaData =
        dataResult.msg === "OK" && "data" in dataResult ? dataResult.data : {};
      set({ uids, currentUid: uid, currentData: gachaData as GachaRecord });
    }
    return result;
  },

  importData: async (type) => {
    const result = await window.api.invoke("gacha:importData", type);
    if (result.msg === "OK" && "data" in result) {
      const uidsResult = await window.api.invoke("gacha:getUids");
      const uids =
        uidsResult.msg === "OK" && "data" in uidsResult
          ? uidsResult.data
          : get().uids;
      const uid = result.data.uid;
      const dataResult = await window.api.invoke("gacha:getData", uid);
      const gachaData =
        dataResult.msg === "OK" && "data" in dataResult ? dataResult.data : {};
      set({ uids, currentUid: uid, currentData: gachaData as GachaRecord });
    }
    return result;
  },

  exportData: async (type, uids) => {
    const { currentUid } = get();
    return await window.api.invoke(
      "gacha:exportData",
      uids ?? currentUid ?? "",
      type,
    );
  },

  getGachaURL: async (server = "cn") => {
    const result = await window.api.invoke("gacha:getURL", server);
    return result as { msg: string; data?: { url: string } };
  },

  getItemStar: (itemId) => {
    const key = `${itemId}`;
    if (itemStarCache[key]) return itemStarCache[key];
    const { avatarConfig, lightConeConfig } = get();
    if (key.length === 4) {
      const rarity = avatarConfig?.[key]?.["Rarity"] as string | undefined;
      itemStarCache[key] = rarity ? +rarity.at(-1)! : 4;
    } else {
      const rarity = lightConeConfig?.[key]?.["Rarity"] as string | undefined;
      itemStarCache[key] = rarity ? +rarity.at(-1)! : 4;
    }
    return itemStarCache[key];
  },

  getItemName: (itemId) => {
    const key = `${itemId}`;
    if (itemNameHashCache[key]) {
      return useTextMapStore.getState().getText(itemNameHashCache[key]);
    }
    const { avatarConfig, lightConeConfig: lightConeConfig } = get();
    let hash: string | undefined;
    if (key.length === 4) {
      hash = (avatarConfig?.[key]?.["AvatarName"] as Record<string, string>)?.[
        "Hash"
      ];
    } else {
      hash = (
        lightConeConfig?.[key]?.["EquipmentName"] as Record<string, string>
      )?.["Hash"];
    }
    if (hash) {
      itemNameHashCache[key] = hash;
      return useTextMapStore.getState().getText(hash);
    }
    return key;
  },

  setViewMode: (mode) => set({ viewMode: mode }),
}));
