#!/usr/bin/env node

/**
 * Sync static assets from Firefly repository to swifty-starrail
 *
 * Usage: node sync.mjs
 *
 * Synced:
 *   - src/static/json/*.json (game data)
 *   - src/renderer/src/assets/image/hsr/ (avatar icons, light cones, achievement icons, etc.)
 *
 * Not synced:
 *   - background images, fonts, favicon, SVG icons
 */

import { execSync } from "child_process";
import {
  existsSync,
  mkdirSync,
  rmSync,
  cpSync,
  readdirSync,
  statSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { tmpdir } from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_URL = "https://github.com/Natrium0521/Firefly";
const CLONE_DIR = join(tmpdir(), "firefly-sync-" + Date.now());

const STATIC_JSON_DEST = join(__dirname, "src/static/json");
const ASSETS_IMAGE_DEST = join(__dirname, "src/renderer/src/assets/image/hsr");

function main() {
  console.log("Cloning Firefly repository (shallow)...");
  execSync(`git clone --depth 1 ${REPO_URL} "${CLONE_DIR}"`, {
    stdio: "inherit",
  });

  try {
    syncStaticJson();
    syncGameImages();
    console.log("Sync complete");
  } finally {
    console.log("Cleaning up temp directory...");
    rmSync(CLONE_DIR, { recursive: true, force: true });
  }
}

function syncStaticJson() {
  const src = join(CLONE_DIR, "src/static/json");
  if (!existsSync(src)) {
    console.log("Warning: src/static/json not found, skipping");
    return;
  }

  mkdirSync(STATIC_JSON_DEST, { recursive: true });

  const files = readdirSync(src).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    cpSync(join(src, file), join(STATIC_JSON_DEST, file));
  }
  console.log(`Synced ${files.length} JSON data files`);
}

function syncGameImages() {
  const src = join(CLONE_DIR, "src/renderer/assets/image/hsr");
  if (!existsSync(src)) {
    console.log("Warning: hsr image directory not found, skipping");
    return;
  }

  mkdirSync(ASSETS_IMAGE_DEST, { recursive: true });

  let count = 0;
  copyDirRecursive(src, ASSETS_IMAGE_DEST, () => {
    count++;
  });
  console.log(`Synced ${count} game image files`);
}

function copyDirRecursive(src, dest, onFile) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    if (statSync(srcPath).isDirectory()) {
      copyDirRecursive(srcPath, destPath, onFile);
    } else {
      cpSync(srcPath, destPath);
      onFile();
    }
  }
}

main();
