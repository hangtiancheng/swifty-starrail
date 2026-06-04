import { app, BrowserWindow, dialog } from "electron";
import { join, dirname } from "path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { readFile, writeFile, rename } from "fs/promises";
import { configService } from "./config-service";
import { settingService } from "./setting-service";
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
  private dataPath: string;
  private uidsPath: string;
  private uids: Record<string, string>;
  private mysBrowserWindow: BrowserWindow | null = null;

  constructor() {
    this.dataPath = join(configService.getAppDataPath(), "achievement");
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
    if (!/^\d{9}$/.test(uid)) return { msg: "无效 UID" };
    if (!this.uids[uid]) {
      await this.newData(uid, "Trailblazer");
    }
    await settingService.set("LastAchievementUid", uid);

    const metaIds = new Set(
      Object.keys((await this.loadStaticJson("AchievementData")) as object),
    );
    const finishedIds = list
      .filter((a) => a.finished && metaIds.has(a.id))
      .map((a) => a.id);

    const oldData = JSON.parse(
      await readFile(join(this.dataPath, `${uid}.json`), "utf-8"),
    );
    const newData: Record<string, unknown> = {};
    const now = Math.floor(Date.now() / 1000);
    for (const id of finishedIds) {
      newData[id] = oldData[id] ?? {
        id,
        timestamp: now,
        current: 0,
        status: 2,
      };
    }
    const filePath = join(this.dataPath, `${uid}.json`);
    const tmpPath = join(this.dataPath, `.${uid}.tmp`);
    await writeFile(tmpPath, JSON.stringify(newData, null, 2), "utf-8");
    await rename(tmpPath, filePath);
    return { msg: "OK", data: uid };
  }

  async getUids(): Promise<IpcResult<Record<string, string>>> {
    return { msg: "OK", data: this.uids };
  }

  async getData(
    uid: string,
    changeLastUid = false,
  ): Promise<IpcResult<Record<string, unknown>>> {
    if (!/^\d{9}$/.test(uid)) return { msg: "无效 UID" };
    if (!this.uids[uid]) return { msg: "UID 不存在" };
    if (changeLastUid) await settingService.set("LastAchievementUid", uid);
    const raw = await readFile(join(this.dataPath, `${uid}.json`), "utf-8");
    return { msg: "OK", data: JSON.parse(raw) };
  }

  async newData(uid: string, nickname: string): Promise<IpcResult> {
    if (!/^\d{9}$/.test(uid)) return { msg: "无效 UID" };
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
    if (!/^\d{9}$/.test(uid)) return { msg: "无效 UID" };
    if (!this.uids[uid]) return { msg: "UID 不存在" };
    if (Object.keys(this.uids).length === 1)
      return { msg: "无法删除最后一个 UID" };
    delete this.uids[uid];
    await this.saveUids();
    return { msg: "OK", data: undefined };
  }

  async exportData(
    uid: string,
    type: string,
  ): Promise<IpcResult<{ path: string }>> {
    if (!/^\d{9}$/.test(uid)) return { msg: "无效 UID" };
    if (!this.uids[uid]) return { msg: "UID 不存在" };
    if (type !== "firefly") return { msg: "未知导出格式" };

    const raw = await readFile(join(this.dataPath, `${uid}.json`), "utf-8");
    const exportData = {
      info: {
        export_app: "lark-star-rail",
        export_app_version: app.getVersion(),
        export_timestamp: Math.floor(Date.now() / 1000),
      },
      list: Object.values(JSON.parse(raw)),
    };

    const result = await dialog.showSaveDialog(
      BrowserWindow.getAllWindows()[0],
      {
        title: "导出成就存档",
        buttonLabel: "导出",
        defaultPath: join(
          app.getPath("desktop"),
          `lark-star-rail-achievement-export-v${app.getVersion()}-${this.uids[uid]}-${uid}.json`,
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
    if (!/^\d{9}$/.test(uid)) return { msg: "无效 UID" };
    if (type !== "firefly") return { msg: "未知导入格式" };

    const result = await dialog.showOpenDialog(
      BrowserWindow.getAllWindows()[0],
      {
        title: "导入存档",
        buttonLabel: "导入",
        defaultPath: app.getPath("desktop"),
        filters: [{ name: "json", extensions: ["json"] }],
      },
    );

    if (result.canceled || result.filePaths.length === 0)
      return { msg: "Canceled" };

    const importData = JSON.parse(await readFile(result.filePaths[0], "utf-8"));
    if (importData?.info?.export_app !== "lark-star-rail") {
      return { msg: "未知来源应用" };
    }
    if (!importData?.list) return { msg: "无数据" };

    const list: Record<string, unknown> = {};
    const now = Math.floor(Date.now() / 1000);
    for (const e of importData.list) {
      if (isNaN(e.id) || isNaN(e.status)) return { msg: "数据格式无效" };
      list[e.id] = {
        id: e.id,
        timestamp: e.timestamp ?? now,
        current: e.current ?? 0,
        status: e.status,
      };
    }
    const filePath = join(this.dataPath, `${uid}.json`);
    const tmpPath = join(this.dataPath, `.${uid}.tmp`);
    await writeFile(tmpPath, JSON.stringify(list, null, 2), "utf-8");
    await rename(tmpPath, filePath);
    return { msg: "OK", data: undefined };
  }

  async setStatus(
    uid: string,
    ids: string[],
    status: number,
  ): Promise<IpcResult> {
    if (!/^\d{9}$/.test(uid)) return { msg: "无效 UID" };
    if (!this.uids[uid]) return { msg: "UID 不存在" };

    const raw = await readFile(join(this.dataPath, `${uid}.json`), "utf-8");
    const data = JSON.parse(raw);
    if (status === 1) {
      for (const id of ids) delete data[id];
    } else {
      const ts = Math.floor(Date.now() / 1000);
      for (const id of ids) {
        data[id] = { id, timestamp: ts, current: 0, status };
      }
    }
    const filePath = join(this.dataPath, `${uid}.json`);
    const tmpPath = join(this.dataPath, `.${uid}.tmp`);
    await writeFile(tmpPath, JSON.stringify(data, null, 2), "utf-8");
    await rename(tmpPath, filePath);
    return { msg: "OK", data: undefined };
  }

  async refreshFromMYS(keepCookie = false, server = "cn"): Promise<IpcResult> {
    const serverConfig = serverConfigs[server];
    if (!serverConfig) return { msg: "不支持的服务器" };

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
                  resolve({ msg: `米游社返回错误: ${data.retcode}` });
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

export const achievementService = new AchievementService();
