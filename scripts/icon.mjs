#!/usr/bin/env node

/**
 * Convert SVG to 256x256 .ico file
 * Usage: node scripts/icon.mjs [input.svg] [output.ico]
 *
 * Dependencies: pnpm add -D sharp png-to-ico
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const inputSvg = process.argv[2] || join(root, "resources/react.svg");
const outputIco = process.argv[3] || join(root, "build/favicon.ico");

const sizes = [16, 32, 48, 64, 128, 256];

async function main() {
  const svgBuffer = readFileSync(inputSvg);

  const pngBuffers = await Promise.all(
    sizes.map((size) =>
      sharp(svgBuffer, { density: 300 }).resize(size, size).png().toBuffer(),
    ),
  );

  const icoBuffer = await pngToIco(pngBuffers);
  writeFileSync(outputIco, icoBuffer);
  console.log(`Generated: ${outputIco} (includes ${sizes.join(", ")}px)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
