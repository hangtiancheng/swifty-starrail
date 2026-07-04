import { resolve } from "path";
import { cpSync } from "fs";
import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { sentryPlugin7 } from "@swifty.js/sentry/vite";

function copyStatic() {
  return {
    name: "copy-static",
    closeBundle() {
      cpSync(resolve("src/static"), resolve("out/static"), { recursive: true });
    },
  };
}

export default defineConfig({
  main: {
    plugins: [copyStatic()],
  },
  preload: {},
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src"),
      },
    },
    plugins: [react(), tailwindcss(), sentryPlugin7({ dsn: "/dev/sentry" })],
    build: {
      cssMinify: "lightningcss",
    },
  },
});
