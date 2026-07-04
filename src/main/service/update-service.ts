import { autoUpdater, CancellationToken } from "electron-updater";
import { app } from "electron";

type UpdateState =
  | "idle"
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "downloaded"
  | "error";

class UpdateService {
  private progress = 0;
  private speed = 0;
  private state: UpdateState = "idle";
  private errorMessage = "";
  private cancellationToken: CancellationToken | null = null;

  constructor() {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on("checking-for-update", () => {
      this.state = "checking";
    });

    autoUpdater.on("update-available", () => {
      this.state = "available";
    });

    autoUpdater.on("update-not-available", () => {
      this.state = "not-available";
    });

    autoUpdater.on("download-progress", (info) => {
      this.state = "downloading";
      this.progress = info.percent / 100;
      this.speed = info.bytesPerSecond;
    });

    autoUpdater.on("update-downloaded", () => {
      this.state = "downloaded";
      this.progress = 1;
    });

    autoUpdater.on("error", (err) => {
      this.state = "error";
      this.errorMessage = err.message;
    });
  }

  async checkForUpdates(): Promise<{ state: UpdateState; version?: string }> {
    this.state = "checking";
    this.errorMessage = "";
    try {
      const result = await autoUpdater.checkForUpdates();
      return {
        state: this.state,
        version: result?.updateInfo.version,
      };
    } catch {
      return { state: "error" };
    }
  }

  async downloadUpdate(): Promise<void> {
    this.progress = 0;
    this.speed = 0;
    this.cancellationToken = new CancellationToken();
    await autoUpdater.downloadUpdate(this.cancellationToken);
  }

  async cancelDownload(): Promise<void> {
    if (this.cancellationToken) {
      this.cancellationToken.cancel();
      this.cancellationToken = null;
    }
    this.state = "idle";
  }

  async getDownloadInfo(): Promise<{
    progress: number;
    speed: number;
    state: UpdateState;
    error?: string;
    version?: string;
  }> {
    return {
      progress: this.progress,
      speed: this.speed,
      state: this.state,
      error: this.errorMessage || undefined,
      version: app.getVersion(),
    };
  }

  async quitAndInstall(): Promise<void> {
    autoUpdater.quitAndInstall();
  }
}

export const updateService = new UpdateService();
