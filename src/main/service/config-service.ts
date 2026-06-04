import { app } from "electron";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

class ConfigService {
  private userDataPath: string;
  private appDataPath: string;
  private appSettingsPath: string;

  constructor() {
    this.userDataPath = app.getPath("userData");
    this.appDataPath = join(this.userDataPath, "data");
    if (!existsSync(this.appDataPath)) mkdirSync(this.appDataPath);
    this.appSettingsPath = join(this.appDataPath, "settings.json");
  }

  getUserDataPath(): string {
    return this.userDataPath;
  }

  getAppDataPath(): string {
    return this.appDataPath;
  }

  getAppSettingsPath(): string {
    return this.appSettingsPath;
  }

  async getAppVersion(): Promise<string> {
    return app.getVersion();
  }
}

export const configService = new ConfigService();
