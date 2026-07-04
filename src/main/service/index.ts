import { ipcMain, shell } from "electron";
import { readFile } from "fs/promises";
import { join } from "path";
import { configService } from "./config-service";
import { settingService } from "./setting-service";
import { achievementService } from "./achievement-service";
import { gachaService } from "./gacha-service";
import { unlockFpsService } from "./unlock-fps-service";
import { updateService } from "./update-service";
import { sentryLogger } from "../logger";

const staticJsonCache = new Map<string, Promise<unknown>>();

export function registerIpcHandlers(): void {
  // config
  ipcMain.handle("config:getAppVersion", () => configService.getAppVersion());

  // setting
  ipcMain.handle("setting:getAppSettings", () => settingService.get());
  ipcMain.handle("setting:setAppSettings", (_ev, key: string, value: unknown) =>
    settingService.set(key, value),
  );

  // achievement
  ipcMain.handle("achievement:getUids", () => achievementService.getUids());
  ipcMain.handle(
    "achievement:getData",
    (_ev, uid: string, changeLastUid?: boolean) =>
      achievementService.getData(uid, changeLastUid),
  );
  ipcMain.handle("achievement:newData", (_ev, uid: string, nickname: string) =>
    achievementService.newData(uid, nickname),
  );
  ipcMain.handle("achievement:delData", (_ev, uid: string) =>
    achievementService.delData(uid),
  );
  ipcMain.handle("achievement:exportData", (_ev, uid: string, type: string) =>
    achievementService.exportData(uid, type),
  );
  ipcMain.handle("achievement:importData", (_ev, uid: string, type: string) =>
    achievementService.importData(uid, type),
  );
  ipcMain.handle(
    "achievement:setStatus",
    (_ev, uid: string, ids: string[], status: number) =>
      achievementService.setStatus(uid, ids, status),
  );
  ipcMain.handle(
    "achievement:refreshFromMYS",
    (_ev, keepCookie?: boolean, server?: string) =>
      achievementService.refreshFromMYS(keepCookie, server),
  );
  ipcMain.handle("achievement:cancelRefreshFromMYS", () =>
    achievementService.cancelRefreshFromMYS(),
  );

  // gacha
  ipcMain.handle("gacha:getUids", () => gachaService.getUids());
  ipcMain.handle("gacha:getData", (_ev, uid: string, changeLastUid?: boolean) =>
    gachaService.getData(uid, changeLastUid),
  );
  ipcMain.handle("gacha:newData", (_ev, uid: string, nickname: string) =>
    gachaService.newData(uid, nickname),
  );
  ipcMain.handle("gacha:delData", (_ev, uid: string) =>
    gachaService.delData(uid),
  );
  ipcMain.handle(
    "gacha:exportData",
    (_ev, uid: string | string[], type: string) =>
      gachaService.exportData(uid, type),
  );
  ipcMain.handle("gacha:importData", (_ev, type: string, data?: object) =>
    gachaService.importData(type, data as Record<string, unknown>),
  );
  ipcMain.handle("gacha:getURL", (_ev, server?: string) =>
    gachaService.getURL(server),
  );

  // unlock fps
  ipcMain.handle("unlockFps:isUnlocked", (_ev, server?: string) =>
    unlockFpsService.isUnlocked(server),
  );
  ipcMain.handle("unlockFps:toggle", (_ev, server?: string) =>
    unlockFpsService.toggle(server),
  );

  // update
  ipcMain.handle("update:checkForUpdates", () =>
    updateService.checkForUpdates(),
  );
  ipcMain.handle("update:downloadUpdate", () => updateService.downloadUpdate());
  ipcMain.handle("update:getDownloadInfo", () =>
    updateService.getDownloadInfo(),
  );
  ipcMain.handle("update:cancelDownload", () => updateService.cancelDownload());
  ipcMain.handle("update:quitAndInstall", () => updateService.quitAndInstall());

  // shell
  ipcMain.handle("shell:showItemInFolder", (_ev, filePath: string) => {
    shell.showItemInFolder(decodeURI(filePath));
  });

  // window:control is registered in main/index.ts

  // sentry
  ipcMain.on("sentry:log", (_ev, events: unknown[]) => {
    for (const event of events) {
      sentryLogger.info(event);
    }
  });

  // static json (cached + async)
  ipcMain.handle("static:loadJson", (_ev, fileName: string) => {
    if (!staticJsonCache.has(fileName)) {
      const filePath = join(__dirname, `../static/json/${fileName}.json`);
      staticJsonCache.set(
        fileName,
        readFile(filePath, "utf-8").then((data) => JSON.parse(data)),
      );
    }
    return staticJsonCache.get(fileName);
  });
}
