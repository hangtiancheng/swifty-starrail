import { resolve } from "path";
import { cpSync } from "fs";
import { defineConfig } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

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
    plugins: [react(), tailwindcss()],
    build: {
      cssMinify: "lightningcss",
    },
  },
});
