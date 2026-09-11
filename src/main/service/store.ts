import { join } from "path";
import { configService } from "./config-service";
import { DataStore } from "./data-store";

export const dataStore = new DataStore(
  join(configService.getAppDataPath(), "store.db"),
);
