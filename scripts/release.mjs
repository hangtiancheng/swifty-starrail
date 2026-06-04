#!/usr/bin/env node

/**
 * 发布脚本
 *
 * 用法:
 *   node release.mjs              # dry-run, 仅构建不发布
 *   node release.mjs win          # 发布 Windows
 *   node release.mjs mac          # 发布 macOS
 *   node release.mjs linux        # 发布 Linux
 *   node release.mjs all          # 发布所有平台
 *
 * 环境变量:
 *   GH_TOKEN - GitHub Personal Access Token (发布到 GitHub Releases 必须)
 */

import "dotenv/config";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"));
const version = pkg.version;

const platform = process.argv[2] || "";
const validPlatforms = ["win", "mac", "linux", "all"];

if (platform && !validPlatforms.includes(platform)) {
  console.error(`无效平台: ${platform}`);
  console.error(`支持: ${validPlatforms.join(", ")} 或留空 (dry-run)`);
  process.exit(1);
}

const dryRun = !platform;

console.log(`版本: v${version}`);
console.log(
  `模式: ${dryRun ? "dry-run (仅构建, 不发布)" : `发布 ${platform}`}`,
);
console.log("");

// 构建
console.log("正在执行 typecheck + build...");
execSync("pnpm build", { stdio: "inherit", cwd: root });

// 打包 + 发布
const publishFlag = dryRun ? "" : "--publish always";
const platformFlags = [];

if (platform === "win" || platform === "all") platformFlags.push("--win");
if (platform === "mac" || platform === "all") platformFlags.push("--mac");
if (platform === "linux" || platform === "all") platformFlags.push("--linux");

if (dryRun) {
  platformFlags.push("--dir");
}

if (!dryRun && !process.env.GH_TOKEN) {
  console.error("错误: 发布模式需要设置 GH_TOKEN 环境变量");
  process.exit(1);
}

const args = [...platformFlags, ...publishFlag.split(" ").filter(Boolean)].join(
  " ",
);
const cmd = `node ./node_modules/electron-builder/cli.js ${args}`.trim();
console.log(`执行: ${cmd}`);
execSync(cmd, { stdio: "inherit", cwd: root });

console.log("");
if (dryRun) {
  console.log(`dry-run 完成, 产物在 dist/ 目录`);
} else {
  console.log(`v${version} 已发布到 GitHub Releases`);
}
