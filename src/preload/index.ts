import { contextBridge, ipcRenderer } from "electron";
import type { IpcApi, IpcChannel } from "../shared/ipc-schema";

export type ApiProxy = {
  invoke<C extends IpcChannel>(
    channel: C,
    ...args: Parameters<IpcApi[C]>
  ): ReturnType<IpcApi[C]>;
};

const api: ApiProxy = {
  invoke(channel, ...args) {
    return ipcRenderer.invoke(channel, ...args) as ReturnType<
      IpcApi[typeof channel]
    >;
  },
};

contextBridge.exposeInMainWorld("api", api);
