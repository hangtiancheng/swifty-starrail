import { app, BrowserWindow, dialog } from "electron";
import { join, dirname } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { readFile, rename, writeFile } from "fs/promises";
import { configService } from "./config-service";
import { settingService } from "./setting-service";
import { dataStore } from "./store";
import type { AchievementRecord } from "./data-store";
import type { IpcResult } from "../../shared/ipc-schema";

const serverConfigs: Record<
  string,
  { pageURL: string; requestURLs: string[] }
> = {
  cn: {
    pageURL:
      "https://act.mihoyo.com/sr/event/cultivation-tool/index.html#/tools/achievement",
    requestURLs: ["*://*.mihoyo.com/event/rpgcultivate/achievement/list*"],
  },
  global: {
    pageURL:
      "https://act.hoyolab.com/sr/event/cultivation-tool/index.html?game_biz=hkrpg_global&hyl_auth_required=true#/tools/achievement",
    requestURLs: [
      "*://*.hoyolab.com/event/rpgcultivate/achievement/list*",
      "*://*.hoyoverse.com/event/rpgcultivate/achievement/list*",
    ],
  },
};

class AchievementService {
  private readonly dataDir: string;
  private mysBrowserWindow: BrowserWindow | null = null;

  constructor() {
    this.dataDir = join(configService.getAppDataPath(), "achievement");
    dataStore.migrateLegacyJson("achievement", this.dataDir);
    if (dataStore.countUids("achievement") === 0) {
      dataStore.upsertUid("achievement", "000000000", "Trailblazer");
    }
  }

  private async loadStaticJson(name: string): Promise<unknown> {
    const raw = await readFile(
      join(__dirname, `../static/json/${name}.json`),
      "utf-8",
    );
    return JSON.parse(raw);
  }

  private getUidFromUrl(url: string, data: Record<string, unknown>): string {
    const params = new URL(url).searchParams;
    return (
      params.get("badge_uid") ??
      params.get("game_uid") ??
      params.get("uid") ??
      params.get("role_id") ??
      ((data?.["data"] as Record<string, unknown>)?.["uid"] as string) ??
      ""
    );
  }

  private async saveRefreshedAchievements(
    uid: string,
    list: Array<{ finished: boolean; id: string }>,
  ): Promise<IpcResult<string>> {
    if (!/^\d{9}$/.test(uid)) return { msg: "Invalid UID" };
    if (!dataStore.hasUid("achievement", uid)) {
      await this.newData(uid, "Trailblazer");
    }
    await settingService.set("LastAchievementUid", uid);

    const metaIds = new Set(
      Object.keys((await this.loadStaticJson("AchievementData")) as object),
    );
    const finishedIds = list
      .filter((a) => a.finished && metaIds.has(a.id))
      .map((a) => a.id);

    const existing = dataStore.getAchievements(uid);
    const now = Math.floor(Date.now() / 1000);
    const records: AchievementRecord[] = finishedIds.map(
      (id) =>
        existing[id] ?? {
          id,
          timestamp: now,
          current: 0,
          status: 2,
        },
    );
    dataStore.replaceAchievements(uid, records);
    return { msg: "OK", data: uid };
  }

  async getUids(): Promise<IpcResult<Record<string, string>>> {
    return { msg: "OK", data: dataStore.listUids("achievement") };
  }

  async getData(
    uid: string,
    changeLastUid = false,
  ): Promise<IpcResult<Record<string, unknown>>> {
    if (!/^\d{9}$/.test(uid)) return { msg: "Invalid UID" };
    if (!dataStore.hasUid("achievement", uid)) {
      return { msg: "UID does not exist" };
    }
    if (changeLastUid) await settingService.set("LastAchievementUid", uid);
    return { msg: "OK", data: dataStore.getAchievements(uid) };
  }

  async newData(uid: string, nickname: string): Promise<IpcResult> {
    if (!/^\d{9}$/.test(uid)) return { msg: "Invalid UID" };
    dataStore.upsertUid("achievement", uid, nickname);
    return { msg: "OK", data: undefined };
  }

  async delData(uid: string): Promise<IpcResult> {
    if (!/^\d{9}$/.test(uid)) return { msg: "Invalid UID" };
    if (!dataStore.hasUid("achievement", uid)) {
      return { msg: "UID does not exist" };
    }
    if (dataStore.countUids("achievement") === 1) {
      return { msg: "Cannot delete the last UID" };
    }
    dataStore.deleteUid("achievement", uid);
    return { msg: "OK", data: undefined };
  }

  async exportData(
    uid: string,
    type: string,
  ): Promise<IpcResult<{ path: string }>> {
    if (!/^\d{9}$/.test(uid)) return { msg: "Invalid UID" };
    if (!dataStore.hasUid("achievement", uid)) {
      return { msg: "UID does not exist" };
    }
    if (type !== "swifty-starrail") return { msg: "Unknown export format" };

    const exportData = {
      info: {
        export_app: "swifty-starrail",
        export_app_version: app.getVersion(),
        export_timestamp: Math.floor(Date.now() / 1000),
      },
      list: Object.values(dataStore.getAchievements(uid)),
    };

    const result = await dialog.showSaveDialog(
      BrowserWindow.getAllWindows()[0],
      {
        title: "Export achievement archive",
        buttonLabel: "Export",
        defaultPath: join(
          app.getPath("desktop"),
          `swifty-starrail-achievement-export-v${app.getVersion()}-${dataStore.listUids("achievement")[uid]}-${uid}.json`,
        ),
        filters: [{ name: "json", extensions: ["json"] }],
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

  async importData(uid: string, type: string): Promise<IpcResult> {
    if (!/^\d{9}$/.test(uid)) return { msg: "Invalid UID" };
    if (!dataStore.hasUid("achievement", uid)) {
      return { msg: "UID does not exist" };
    }
    if (type !== "swifty-starrail") return { msg: "Unknown import format" };

    const result = await dialog.showOpenDialog(
      BrowserWindow.getAllWindows()[0],
      {
        title: "Import archive",
        buttonLabel: "Import",
        defaultPath: app.getPath("desktop"),
        filters: [{ name: "json", extensions: ["json"] }],
      },
    );

    if (result.canceled || result.filePaths.length === 0)
      return { msg: "Canceled" };

    const importData = JSON.parse(await readFile(result.filePaths[0], "utf-8"));
    if (importData?.info?.export_app !== "swifty-starrail") {
      return { msg: "Unknown source app" };
    }
    if (!importData?.list) return { msg: "No data" };

    const records: AchievementRecord[] = [];
    const now = Math.floor(Date.now() / 1000);
    for (const e of importData.list) {
      if (isNaN(e.id) || isNaN(e.status)) return { msg: "Invalid data format" };
      records.push({
        id: `${e.id}`,
        timestamp: e.timestamp ?? now,
        current: e.current ?? 0,
        status: e.status,
      });
    }
    dataStore.replaceAchievements(uid, records);
    return { msg: "OK", data: undefined };
  }

  async setStatus(
    uid: string,
    ids: string[],
    status: number,
  ): Promise<IpcResult> {
    if (!/^\d{9}$/.test(uid)) return { msg: "Invalid UID" };
    if (!dataStore.hasUid("achievement", uid)) {
      return { msg: "UID does not exist" };
    }

    if (status === 1) {
      dataStore.deleteAchievements(uid, ids);
    } else {
      const ts = Math.floor(Date.now() / 1000);
      dataStore.upsertAchievements(
        uid,
        ids.map((id) => ({ id, timestamp: ts, current: 0, status })),
      );
    }
    return { msg: "OK", data: undefined };
  }

  async refreshFromMYS(keepCookie = false, server = "cn"): Promise<IpcResult> {
    const serverConfig = serverConfigs[server];
    if (!serverConfig) return { msg: "Unsupported server" };

    return new Promise((resolve) => {
      this.mysBrowserWindow = new BrowserWindow({
        width: 720,
        height: 480,
        minWidth: 720,
        minHeight: 480,
      });

      this.mysBrowserWindow.on("closed", () => {
        this.mysBrowserWindow = null;
        resolve({ msg: "Canceled" });
      });

      const prepare = keepCookie
        ? Promise.resolve()
        : this.mysBrowserWindow.webContents.session.clearStorageData({
            storages: ["cookies"],
          });

      prepare.then(() => {
        this.mysBrowserWindow!.loadURL(serverConfig.pageURL);
        let handled = false;
        const session = this.mysBrowserWindow!.webContents.session;

        const unregisterListener = () => {
          session.webRequest.onBeforeSendHeaders(
            { urls: serverConfig.requestURLs },
            null,
          );
        };

        session.webRequest.onBeforeSendHeaders(
          { urls: serverConfig.requestURLs },
          (details, callback) => {
            if (details.method === "OPTIONS" || handled) return callback({});
            handled = true;

            const urlObj = new URL(details.url);
            urlObj.searchParams.set("need_all", "true");
            urlObj.searchParams.set("show_hide", "true");

            fetch(urlObj.href, {
              headers: details.requestHeaders as HeadersInit,
            })
              .then((r) => r.json())
              .then(async (data) => {
                if (data.retcode === 0) {
                  const uid = this.getUidFromUrl(urlObj.href, data);
                  const ret = await this.saveRefreshedAchievements(
                    uid,
                    data.data.achievement_list ?? [],
                  );
                  resolve(ret);
                } else {
                  resolve({ msg: `米游社 API error: ${data.retcode}` });
                }
                unregisterListener();
                this.mysBrowserWindow?.close();
              })
              .catch((err) => {
                resolve({ msg: err.message });
                unregisterListener();
                this.mysBrowserWindow?.close();
              });

            callback({});
          },
        );
      });
    });
  }

  async cancelRefreshFromMYS(): Promise<void> {
    this.mysBrowserWindow?.close();
    this.mysBrowserWindow = null;
  }
}

// ---------------------------------------------------------------------
// @deprecated Legacy JSON storage implementation, kept for reference after
// the node:sqlite migration (data-store.ts). Do not use in new code; the
// one-time data import happens via dataStore.migrateLegacyJson().
// ---------------------------------------------------------------------

const legacyDataDir = join(configService.getAppDataPath(), "achievement");
const legacyUidsPath = join(legacyDataDir, "uids.json");

/** @deprecated Legacy JSON storage, superseded by node:sqlite. */
export const legacyAchievementJsonStorage = {
  init(): Record<string, string> {
    if (!existsSync(legacyDataDir)) mkdirSync(legacyDataDir);
    if (!existsSync(legacyUidsPath)) {
      writeFileSync(
        legacyUidsPath,
        JSON.stringify({ "000000000": "Trailblazer" }, null, 2),
        "utf-8",
      );
      writeFileSync(
        join(legacyDataDir, "000000000.json"),
        JSON.stringify({}, null, 2),
        "utf-8",
      );
    }
    return JSON.parse(readFileSync(legacyUidsPath, "utf-8"));
  },

  async saveUids(uids: Record<string, string>): Promise<void> {
    const sorted = Object.keys(uids)
      .sort()
      .reduce<Record<string, string>>((acc, key) => {
        acc[key] = uids[key];
        return acc;
      }, {});
    const tmp = join(dirname(legacyUidsPath), ".uids.tmp");
    await writeFile(tmp, JSON.stringify(sorted, null, 2), "utf-8");
    await rename(tmp, legacyUidsPath);
  },

  async readUidData(uid: string): Promise<Record<string, unknown>> {
    const raw = await readFile(join(legacyDataDir, `${uid}.json`), "utf-8");
    return JSON.parse(raw);
  },

  async writeUidData(
    uid: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const filePath = join(legacyDataDir, `${uid}.json`);
    const tmpPath = join(legacyDataDir, `.${uid}.tmp`);
    await writeFile(tmpPath, JSON.stringify(data, null, 2), "utf-8");
    await rename(tmpPath, filePath);
  },
};

export const achievementService = new AchievementService();
