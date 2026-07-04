import { existsSync, readFileSync } from "fs";
import { writeFile, rename } from "fs/promises";
import { join, dirname } from "path";
import { configService } from "./config-service";
import { appSettingsSchema, type AppSettings } from "../../shared/ipc-schema";

const defaultSettings: AppSettings = {
  Debug: false,
  CloseDirectly: true,
  LastAchievementUid: "000000000",
  LastGachaUid: "000000000",
  SidebarCollapsed: false,
  CheckUpdateOnLaunch: true,
};

class SettingService {
  private settings: AppSettings;
  private filePath: string;

  constructor() {
    this.filePath = configService.getAppSettingsPath();
    if (existsSync(this.filePath)) {
      const raw = JSON.parse(readFileSync(this.filePath, "utf-8"));
      this.settings = { ...defaultSettings, ...raw };
    } else {
      this.settings = { ...defaultSettings };
    }
    void this.save();
  }

  private async save(): Promise<void> {
    const tmp = join(dirname(this.filePath), `.settings.tmp`);
    await writeFile(tmp, JSON.stringify(this.settings, null, 2), "utf-8");
    await rename(tmp, this.filePath);
  }

  getSync(): AppSettings {
    return this.settings;
  }

  async get(): Promise<AppSettings> {
    return this.settings;
  }

  async set(key: string, value: unknown): Promise<AppSettings> {
    if (!(key in this.settings)) return this.settings;
    const current = this.settings[key as keyof AppSettings];
    if (typeof current !== typeof value) return this.settings;
    (this.settings as Record<string, unknown>)[key] = value;
    const result = appSettingsSchema.safeParse(this.settings);
    if (!result.success) {
      (this.settings as Record<string, unknown>)[key] = current;
      return this.settings;
    }
    this.settings = result.data;
    await this.save();
    return this.settings;
  }
}

export const settingService = new SettingService();
