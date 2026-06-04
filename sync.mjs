#!/usr/bin/env node

/**
 * 从 Firefly 仓库同步静态资源到 lark-star-rail
 *
 * 用法: node sync.mjs
 *
 * 同步内容:
 *   - src/static/json/*.json (游戏数据)
 *   - src/renderer/src/assets/image/hsr/ (角色头像、光锥、成就图标等)
 *
 * 不同步:
 *   - 背景图片、字体、favicon、SVG 图标
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
  console.log("正在克隆 Firefly 仓库（shallow）...");
  execSync(`git clone --depth 1 ${REPO_URL} "${CLONE_DIR}"`, {
    stdio: "inherit",
  });

  try {
    syncStaticJson();
    syncGameImages();
    console.log("同步完成");
  } finally {
    console.log("清理临时目录...");
    rmSync(CLONE_DIR, { recursive: true, force: true });
  }
}

function syncStaticJson() {
  const src = join(CLONE_DIR, "src/static/json");
  if (!existsSync(src)) {
    console.log("警告: 未找到 src/static/json，跳过");
    return;
  }

  mkdirSync(STATIC_JSON_DEST, { recursive: true });

  const files = readdirSync(src).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    cpSync(join(src, file), join(STATIC_JSON_DEST, file));
  }
  console.log(`同步了 ${files.length} 个 JSON 数据文件`);
}

function syncGameImages() {
  const src = join(CLONE_DIR, "src/renderer/assets/image/hsr");
  if (!existsSync(src)) {
    console.log("警告: 未找到 hsr 图片目录，跳过");
    return;
  }

  mkdirSync(ASSETS_IMAGE_DEST, { recursive: true });

  let count = 0;
  copyDirRecursive(src, ASSETS_IMAGE_DEST, () => {
    count++;
  });
  console.log(`同步了 ${count} 个游戏图片文件`);
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
