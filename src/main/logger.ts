import { app } from "electron";
import { join } from "path";
import { mkdirSync } from "fs";
import pino from "pino";

const logDir = join(app.getPath("userData"), "logs");
mkdirSync(logDir, { recursive: true });

export const sentryLogger = pino(
  { name: "sentry" },
  pino.destination(join(logDir, "sentry.log")),
);
