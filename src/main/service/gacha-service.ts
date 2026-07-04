import { app, BrowserWindow, dialog } from "electron";
import { join, dirname } from "path";
import {
  existsSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  mkdirSync,
} from "fs";
import { readFile, writeFile, rename } from "fs/promises";
import { configService } from "./config-service";
import { settingService } from "./setting-service";
import type { IpcResult } from "../../shared/ipc-schema";

const serverConfigs: Record<
  string,
  { playerLogPaths: string[]; urlPattern: RegExp }
> = {
  cn: {
    playerLogPaths: [
      "../../../LocalLow/miHoYo/崩坏：星穹铁道/Player.log",
      "../../../LocalLow/miHoYo/崩坏：星穹铁道/Player-prev.log",
    ],
    urlPattern: /^http.*(?:hkrpg|api).*mihoyo\.com.*?gacha.*\?/i,
  },
  global: {
    playerLogPaths: [
      "../../../LocalLow/Cognosphere/Star Rail/Player.log",
      "../../../LocalLow/Cognosphere/Star Rail/Player-prev.log",
    ],
    urlPattern: /^http.*(?:hkrpg|api).*hoyoverse\.com.*?gacha.*\?/i,
  },
};

class GachaService {
  private dataPath: string;
  private uidsPath: string;
  private uids: Record<string, string>;

  constructor() {
    this.dataPath = join(configService.getAppDataPath(), "gacha");
    if (!existsSync(this.dataPath)) mkdirSync(this.dataPath);
    this.uidsPath = join(this.dataPath, "uids.json");
    if (!existsSync(this.uidsPath)) {
      writeFileSync(
        this.uidsPath,
        JSON.stringify({ "000000000": "Trailblazer" }, null, 2),
        "utf-8",
      );
      writeFileSync(
        join(this.dataPath, "000000000.json"),
        JSON.stringify({}, null, 2),
        "utf-8",
      );
    }
    this.uids = JSON.parse(readFileSync(this.uidsPath, "utf-8"));
  }

  private async saveUids(): Promise<void> {
    this.uids = Object.keys(this.uids)
      .sort()
      .reduce<Record<string, string>>((acc, key) => {
        acc[key] = this.uids[key];
        return acc;
      }, {});
    const tmp = join(dirname(this.uidsPath), ".uids.tmp");
    await writeFile(tmp, JSON.stringify(this.uids, null, 2), "utf-8");
    await rename(tmp, this.uidsPath);
  }

  private async loadStaticJson(name: string): Promise<unknown> {
    const raw = await readFile(
      join(__dirname, `../static/json/${name}.json`),
      "utf-8",
    );
    return JSON.parse(raw);
  }

  private async getGameDataPath(playerLogPath: string): Promise<string> {
    if (!existsSync(playerLogPath)) return "";
    const log = await readFile(playerLogPath, "utf-8");
    return (
      log.match(/Loading player data from (.*)data\.unity3d/)?.[1] ??
      log.match(/.:\/.+StarRail_Data/)?.[0] ??
      ""
    );
  }

  private compareVersion(a: string, b: string): number {
    const pa = a.split(".").map((s) => parseInt(s) || 0);
    const pb = b.split(".").map((s) => parseInt(s) || 0);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
      const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
      if (diff !== 0) return diff;
    }
    return 0;
  }

  private getLatestWebCachePath(gameDataPath: string): string {
    const webCachePath = join(gameDataPath, "webCaches");
    if (!existsSync(webCachePath)) return "";
    let latest = "0.0.0.0";
    for (const name of readdirSync(webCachePath)) {
      if (
        statSync(join(webCachePath, name)).isDirectory() &&
        /^\d+\.\d+\.\d+\.\d+$/.test(name)
      ) {
        if (this.compareVersion(name, latest) > 0) {
          latest = name;
        }
      }
    }
    if (latest === "0.0.0.0") return "";
    return join(webCachePath, latest, "Cache/Cache_Data/data_2");
  }

  async getUids(): Promise<IpcResult<Record<string, string>>> {
    return { msg: "OK", data: this.uids };
  }

  async getData(
    uid: string,
    changeLastUid = false,
  ): Promise<IpcResult<Record<string, unknown>>> {
    if (!/^\d{9}$/.test(uid)) return { msg: "Invalid UID" };
    if (!this.uids[uid]) return { msg: "UID does not exist" };
    if (changeLastUid) await settingService.set("LastGachaUid", uid);
    const raw = await readFile(join(this.dataPath, `${uid}.json`), "utf-8");
    return { msg: "OK", data: JSON.parse(raw) };
  }

  async newData(uid: string, nickname: string): Promise<IpcResult> {
    if (!/^\d{9}$/.test(uid)) return { msg: "Invalid UID" };
    if (!this.uids[uid]) {
      await writeFile(
        join(this.dataPath, `${uid}.json`),
        JSON.stringify({}, null, 2),
        "utf-8",
      );
    }
    this.uids[uid] = nickname;
    await this.saveUids();
    return { msg: "OK", data: undefined };
  }

  async delData(uid: string): Promise<IpcResult> {
    if (!/^\d{9}$/.test(uid)) return { msg: "Invalid UID" };
    if (!this.uids[uid]) return { msg: "UID does not exist" };
    if (Object.keys(this.uids).length === 1)
      return { msg: "Cannot delete the last UID" };
    delete this.uids[uid];
    await this.saveUids();
    return { msg: "OK", data: undefined };
  }

  async exportData(
    uid: string | string[],
    type = "srgf_v1.0",
  ): Promise<IpcResult<{ path: string }>> {
    const [avatarBase, avatarLD, equipment, textMap] = await Promise.all([
      this.loadStaticJson("AvatarConfig"),
      this.loadStaticJson("AvatarConfigLD"),
      this.loadStaticJson("EquipmentConfig"),
      this.loadStaticJson("TextMapCHS"),
    ]);
    const AvatarConfig = {
      ...(avatarBase as object),
      ...(avatarLD as object),
    } as Record<string, Record<string, unknown>>;
    const EquipmentConfig = equipment as Record<
      string,
      Record<string, unknown>
    >;
    const TextMapCHS = textMap as Record<string, string>;

    if (type === "srgf_v1.0" && !Array.isArray(uid)) {
      if (!/^\d{9}$/.test(uid)) return { msg: "Invalid UID" };
      if (!this.uids[uid]) return { msg: "UID does not exist" };

      const exportData = {
        info: {
          srgf_version: "v1.0",
          uid,
          lang: "zh-cn",
          region_time_zone: 8,
          export_app: "swifty-starrail",
          export_app_version: app.getVersion(),
          export_timestamp: Math.floor(Date.now() / 1000),
        },
        list: [] as Record<string, unknown>[],
      };

      const raw = JSON.parse(
        await readFile(join(this.dataPath, `${uid}.json`), "utf-8"),
      );
      for (const item of Object.values(raw) as Record<string, string>[]) {
        const node = { ...item, count: "1" } as Record<string, unknown>;
        if (item.item_id.length === 4) {
          node.item_type = "角色";
          node.name =
            TextMapCHS[
              (
                AvatarConfig[item.item_id]?.["AvatarName"] as Record<
                  string,
                  string
                >
              )?.["Hash"]
            ];
          node.rank_type = (
            AvatarConfig[item.item_id]?.["Rarity"] as string
          )?.at(-1);
        } else {
          node.item_type = "光锥";
          node.name =
            TextMapCHS[
              (
                EquipmentConfig[item.item_id]?.["EquipmentName"] as Record<
                  string,
                  string
                >
              )?.["Hash"]
            ];
          node.rank_type = (
            EquipmentConfig[item.item_id]?.["Rarity"] as string
          )?.at(-1);
        }
        exportData.list.push(node);
      }

      const result = await dialog.showSaveDialog(
        BrowserWindow.getAllWindows()[0],
        {
          title: "Export 跃迁记录 as SRGF",
          buttonLabel: "Export",
          defaultPath: join(
            app.getPath("desktop"),
            `swifty-starrail-gacha-export-v${app.getVersion()}-${this.uids[uid]}-${uid}.SRGF.json`,
          ),
          filters: [{ name: "SRGF json", extensions: ["json"] }],
        },
      );
      if (result.canceled || !result.filePath) return { msg: "Canceled" };
      await writeFile(
        result.filePath,
        JSON.stringify(exportData, null, 2),
        "utf-8",
      );
      return { msg: "OK", data: { path: encodeURI(result.filePath) } };
    }

    if (type === "uigf_v4.1") {
      const uids =
        Array.isArray(uid) && uid.length > 0 ? uid : Object.keys(this.uids);
      const exportData = {
        info: {
          export_app: "swifty-starrail",
          export_app_version: app.getVersion(),
          export_timestamp: Math.floor(Date.now() / 1000),
          version: "v4.1",
        },
        hkrpg: [] as Record<string, unknown>[],
      };

      for (const u of uids) {
        const userNode = {
          uid: u,
          lang: "zh-cn",
          timezone: 8,
          list: [] as Record<string, unknown>[],
        };
        const raw = JSON.parse(
          await readFile(join(this.dataPath, `${u}.json`), "utf-8"),
        );
        for (const item of Object.values(raw) as Record<string, string>[]) {
          const node = { ...item, count: "1" } as Record<string, unknown>;
          if (item.item_id.length === 4) {
            node.item_type = "角色";
            node.name =
              TextMapCHS[
                (
                  AvatarConfig[item.item_id]?.["AvatarName"] as Record<
                    string,
                    string
                  >
                )?.["Hash"]
              ];
            node.rank_type = (
              AvatarConfig[item.item_id]?.["Rarity"] as string
            )?.at(-1);
          } else {
            node.item_type = "光锥";
            node.name =
              TextMapCHS[
                (
                  EquipmentConfig[item.item_id]?.["EquipmentName"] as Record<
                    string,
                    string
                  >
                )?.["Hash"]
              ];
            node.rank_type = (
              EquipmentConfig[item.item_id]?.["Rarity"] as string
            )?.at(-1);
          }
          userNode.list.push(node);
        }
        exportData.hkrpg.push(userNode);
      }

      const result = await dialog.showSaveDialog(
        BrowserWindow.getAllWindows()[0],
        {
          title: "Export 跃迁记录 as UIGF",
          buttonLabel: "Export",
          defaultPath: join(
            app.getPath("desktop"),
            `swifty-starrail-gacha-export-v${app.getVersion()}.UIGF.json`,
          ),
          filters: [{ name: "UIGF json", extensions: ["json"] }],
        },
      );
      if (result.canceled || !result.filePath) return { msg: "Canceled" };
      await writeFile(
        result.filePath,
        JSON.stringify(exportData, null, 2),
        "utf-8",
      );
      return { msg: "OK", data: { path: encodeURI(result.filePath) } };
    }

    return { msg: "Unknown export format" };
  }

  async importData(
    type = "srgf_v1.0",
    data: Record<string, unknown> = {},
  ): Promise<IpcResult<{ uid: string }>> {
    if (type === "srgf_v1.0" && Object.keys(data).length === 0) {
      const result = await dialog.showOpenDialog(
        BrowserWindow.getAllWindows()[0],
        {
          title: "Import SRGF 跃迁记录",
          buttonLabel: "Import",
          defaultPath: app.getPath("desktop"),
          filters: [{ name: "SRGF json", extensions: ["json"] }],
        },
      );
      if (result.canceled || result.filePaths.length === 0)
        return { msg: "Canceled" };
      data = JSON.parse(await readFile(result.filePaths[0], "utf-8"));
      if (
        (data as Record<string, Record<string, string>>).info?.srgf_version !==
        "v1.0"
      )
        return { msg: "Unsupported SRGF version" };
      if (!(data as Record<string, unknown>).list) return { msg: "No data" };
    }

    if (
      (type === "uigf_v4.0" || type === "uigf_v4.1") &&
      Object.keys(data).length === 0
    ) {
      const result = await dialog.showOpenDialog(
        BrowserWindow.getAllWindows()[0],
        {
          title: "Import UIGF 跃迁记录",
          buttonLabel: "Import",
          defaultPath: app.getPath("desktop"),
          filters: [{ name: "UIGF json", extensions: ["json"] }],
        },
      );
      if (result.canceled || result.filePaths.length === 0)
        return { msg: "Canceled" };
      data = JSON.parse(await readFile(result.filePaths[0], "utf-8"));

      const info = (data as Record<string, Record<string, string>>).info;
      if (info?.version !== "v4.0" && info?.version !== "v4.1")
        return { msg: "Unsupported UIGF version" };

      const hkrpg = (data as Record<string, unknown[]>).hkrpg;
      if (!hkrpg || hkrpg.length === 0) return { msg: "No Star Rail data" };

      let lastUid = "";
      for (const userNode of hkrpg as Record<string, unknown>[]) {
        if (!/^\d{9}$/.test(userNode.uid as string))
          return { msg: "Invalid UID" };
        const srgfData = {
          info: { region_time_zone: userNode.timezone, uid: userNode.uid },
          list: userNode.list,
        };
        await this.importData("srgf_v1.0", srgfData as Record<string, unknown>);
        lastUid = userNode.uid as string;
      }
      return { msg: "OK", data: { uid: lastUid } };
    }

    const info = (data as Record<string, Record<string, unknown>>).info;
    const uid = `${info.uid}`;
    if (!/^\d{9}$/.test(uid)) return { msg: "Invalid UID" };

    if (!this.uids[uid]) {
      await writeFile(
        join(this.dataPath, `${uid}.json`),
        JSON.stringify({}, null, 2),
        "utf-8",
      );
      this.uids[uid] = "Trailblazer";
      await this.saveUids();
    }

    const regionTz = (info.region_time_zone as number) ?? 8;
    const list = (data as Record<string, Record<string, string>[]>).list ?? [];
    if (regionTz !== 8) {
      for (const item of list) {
        const tmp = new Date(item.time);
        tmp.setHours(tmp.getHours() - regionTz + 8);
        item.time =
          `${tmp.getFullYear()}-` +
          `0${tmp.getMonth() + 1}-`.slice(-3) +
          `0${tmp.getDate()} `.slice(-3) +
          `0${tmp.getHours()}:`.slice(-3) +
          `0${tmp.getMinutes()}:`.slice(-3) +
          `0${tmp.getSeconds()}`.slice(-2);
      }
    }

    let existing = JSON.parse(
      await readFile(join(this.dataPath, `${uid}.json`), "utf-8"),
    );
    const itemKeys = ["gacha_id", "gacha_type", "item_id", "time", "id"];
    for (const item of list) {
      if (!existing[item.id]) {
        const tmp: Record<string, string> = {};
        for (const key of itemKeys) {
          if (!item[key]) return { msg: "Invalid data format" };
          tmp[key] = item[key];
        }
        existing[item.id] = tmp;
      }
    }
    existing = Object.fromEntries(Object.entries(existing).sort());
    const uidFilePath = join(this.dataPath, `${uid}.json`);
    const tmpPath = join(this.dataPath, `.${uid}.tmp`);
    await writeFile(tmpPath, JSON.stringify(existing, null, 2), "utf-8");
    await rename(tmpPath, uidFilePath);
    await settingService.set("LastGachaUid", uid);
    return { msg: "OK", data: { uid } };
  }

  async getURL(server = "cn"): Promise<IpcResult<{ url: string }>> {
    const serverConfig = serverConfigs[server];
    if (!serverConfig) return { msg: "Unsupported server" };

    let url = "";
    const appDataPath = configService.getAppDataPath();
    const webCachePaths: string[] = [];

    for (const logPath of serverConfig.playerLogPaths) {
      const gameDataPath = await this.getGameDataPath(
        join(appDataPath, logPath),
      );
      if (gameDataPath) {
        const cachePath = this.getLatestWebCachePath(gameDataPath);
        if (cachePath) webCachePaths.push(cachePath);
      }
    }

    for (const cachePath of webCachePaths) {
      if (!existsSync(cachePath)) continue;
      const lines = (await readFile(cachePath, "utf-8")).split("1/0/");
      for (const line of lines) {
        if (serverConfig.urlPattern.test(line)) {
          url =
            // eslint-disable-next-line no-control-regex
            line.match(/^.*?\x00/)?.[0]?.slice(0, -1) ??
            line.match(/^https?:\/\/\S+/)?.[0] ??
            "";
        }
      }
      if (url) break;
    }

    if (!url) return { msg: "URL not found" };

    const urlObj = new URL(url);
    const keepKeys = [
      "authkey_ver",
      "authkey",
      "sign_type",
      "game_biz",
      "lang",
    ];
    const filtered = new URLSearchParams(
      Array.from(urlObj.searchParams.entries()).filter(([k]) =>
        keepKeys.includes(k),
      ),
    );
    urlObj.search = filtered.toString();
    return { msg: "OK", data: { url: urlObj.href } };
  }
}

export const gachaService = new GachaService();
