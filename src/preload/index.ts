import { contextBridge, ipcRenderer } from "electron";
import type { IpcApi, IpcChannel } from "../shared/ipc-schema";

type FireAndForgetChannel = {
  [K in IpcChannel]: ReturnType<IpcApi[K]> extends void ? K : never;
}[IpcChannel];

export type ApiProxy = {
  invoke<C extends IpcChannel>(
    channel: C,
    ...args: Parameters<IpcApi[C]>
  ): ReturnType<IpcApi[C]>;
  send<C extends FireAndForgetChannel>(
    channel: C,
    ...args: Parameters<IpcApi[C]>
  ): void;
};

const api: ApiProxy = {
  invoke(channel, ...args) {
    return ipcRenderer.invoke(channel, ...args) as ReturnType<
      IpcApi[typeof channel]
    >;
  },
  send(channel, ...args) {
    ipcRenderer.send(channel, ...args);
  },
};

contextBridge.exposeInMainWorld("api", api);
