import { z } from "zod";

// ============ Settings ============

export const appSettingsSchema = z.object({
  Debug: z.boolean(),
  CloseDirectly: z.boolean(),
  LastAchievementUid: z.string(),
  LastGachaUid: z.string(),
  SidebarCollapsed: z.boolean(),
  CheckUpdateOnLaunch: z.boolean(),
});

export type AppSettings = z.infer<typeof appSettingsSchema>;

// ============ Common Response ============

export type IpcResult<T = unknown> = { msg: "OK"; data: T } | { msg: string };

export function isOk<T>(
  result: IpcResult<T>,
): result is { msg: "OK"; data: T } {
  return result.msg === "OK";
}

// ============ IPC Channel Definitions ============

export type IpcApi = {
  // config
  "config:getAppVersion": () => Promise<string>;

  // setting
  "setting:getAppSettings": () => Promise<AppSettings>;
  "setting:setAppSettings": (
    key: string,
    value: unknown,
  ) => Promise<AppSettings>;

  // achievement
  "achievement:getUids": () => Promise<IpcResult<Record<string, string>>>;
  "achievement:getData": (
    uid: string,
    changeLastUid?: boolean,
  ) => Promise<IpcResult<Record<string, unknown>>>;
  "achievement:newData": (uid: string, nickname: string) => Promise<IpcResult>;
  "achievement:delData": (uid: string) => Promise<IpcResult>;
  "achievement:exportData": (
    uid: string,
    type: string,
  ) => Promise<IpcResult<{ path: string }>>;
  "achievement:importData": (uid: string, type: string) => Promise<IpcResult>;
  "achievement:setStatus": (
    uid: string,
    achievementIds: string[],
    status: number,
  ) => Promise<IpcResult>;
  "achievement:refreshFromMYS": (
    keepCookie?: boolean,
    server?: string,
  ) => Promise<IpcResult>;
  "achievement:cancelRefreshFromMYS": () => Promise<void>;

  // gacha
  "gacha:getUids": () => Promise<IpcResult<Record<string, string>>>;
  "gacha:getData": (
    uid: string,
    changeLastUid?: boolean,
  ) => Promise<IpcResult<Record<string, unknown>>>;
  "gacha:newData": (uid: string, nickname: string) => Promise<IpcResult>;
  "gacha:delData": (uid: string) => Promise<IpcResult>;
  "gacha:exportData": (
    uid: string | string[],
    type: string,
  ) => Promise<IpcResult<{ path: string }>>;
  "gacha:importData": (
    type: string,
    data?: object,
  ) => Promise<IpcResult<{ uid: string }>>;
  "gacha:getURL": (server?: string) => Promise<IpcResult<{ url: string }>>;

  // unlock fps
  "unlockFps:isUnlocked": (server?: string) => Promise<{ msg: string }>;
  "unlockFps:toggle": (
    server?: string,
  ) => Promise<{ msg: string; fps?: number }>;

  // update
  "update:checkForUpdates": () => Promise<{
    state: string;
    version?: string;
  }>;
  "update:downloadUpdate": () => Promise<void>;
  "update:getDownloadInfo": () => Promise<{
    progress: number;
    speed: number;
    state: string;
    error?: string;
    version?: string;
  }>;
  "update:cancelDownload": () => Promise<void>;
  "update:quitAndInstall": () => Promise<void>;

  // window
  "window:control": (
    action: "close" | "maximize" | "minimize" | "hide",
  ) => Promise<void>;

  // shell
  "shell:showItemInFolder": (path: string) => Promise<void>;

  // static json
  "static:loadJson": (fileName: string) => Promise<unknown>;

  // sentry
  "sentry:log": (events: readonly unknown[]) => void;
};

export type IpcChannel = keyof IpcApi;
