#!/usr/bin/env node

/**
 * 修复 electron 二进制未正确安装的问题
 *
 * 当 pnpm install 后 electron 无法启动（报 "Electron uninstall"）时运行：
 *   node fix.js
 *
 * 原理：从 npmmirror 下载 electron zip，解压到 node_modules/electron/dist
 */

import { execSync } from "child_process";
import {
  existsSync,
  realpathSync,
  readFileSync,
  writeFileSync,
  rmSync,
  mkdirSync,
} from "fs";
import { join, dirname } from "path";
import { tmpdir, homedir, platform as osPlatform, arch as osArch } from "os";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const electronDir = join(__dirname, "node_modules/electron");
const { version } = require(join(electronDir, "package.json"));

const platform = osPlatform();
const arch = osArch();
const mirror = "https://npmmirror.com/mirrors/electron/";
const fileName = `electron-v${version}-${platform}-${arch}.zip`;
const url = `${mirror}v${version}/${fileName}`;

// pnpm 实际存储路径（符号链接目标）
const realElectronDir = realpathSync(electronDir);
const distDir = join(realElectronDir, "dist");

function getPlatformPath() {
  switch (platform) {
    case "darwin":
      return "Electron.app/Contents/MacOS/Electron";
    case "linux":
      return "electron";
    case "win32":
      return "electron.exe";
    default:
      throw new Error(`不支持的平台: ${platform}`);
  }
}

function findCachedZip() {
  const cacheDir = join(homedir(), "Library/Caches/electron");
  if (!existsSync(cacheDir)) return null;
  try {
    const result = execSync(`find "${cacheDir}" -name "${fileName}" -type f`, {
      encoding: "utf-8",
    }).trim();
    return result || null;
  } catch {
    return null;
  }
}

console.log(`electron v${version} / ${platform}-${arch}`);
console.log(`实际路径: ${realElectronDir}`);

const existingPath = join(distDir, getPlatformPath());
if (existsSync(existingPath)) {
  // 检查 path.txt 是否干净（无尾部换行）
  const pathTxt = join(realElectronDir, "path.txt");
  if (existsSync(pathTxt)) {
    const content = readFileSync(pathTxt, "utf-8");
    if (content !== getPlatformPath()) {
      writeFileSync(pathTxt, getPlatformPath());
      console.log("修复了 path.txt 中的尾部换行");
      process.exit(0);
    }
  }
  console.log("electron 二进制已存在，无需修复");
  process.exit(0);
}

let zipPath = findCachedZip();

if (!zipPath) {
  console.log(`缓存未命中，从 ${url} 下载...`);
  zipPath = join(tmpdir(), fileName);
  execSync(`curl -L -o "${zipPath}" "${url}"`, { stdio: "inherit" });
} else {
  console.log(`使用缓存: ${zipPath}`);
}

if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true });
}
mkdirSync(distDir, { recursive: true });

console.log("解压中...");
execSync(`unzip -q "${zipPath}" -d "${distDir}"`, { stdio: "inherit" });

// 写入 path.txt 时不能有尾部换行，否则 electron-vite 拼接路径会出错
writeFileSync(join(realElectronDir, "path.txt"), getPlatformPath());
writeFileSync(join(distDir, "version"), version);

console.log("修复完成");
