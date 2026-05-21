/**
 * Generates PWA icons at 192×192 and 512×512 from a COO SVG source.
 * Uses only Node.js built-ins — no extra dependencies needed.
 *
 * Usage: node scripts/generate-icons.mjs
 *
 * Requires: @resvg/resvg-js  OR  sharp (whichever you prefer)
 * Install:  npm install -D @resvg/resvg-js
 *           (or: npm install -D sharp)
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "public", "icons");

mkdirSync(outDir, { recursive: true });

// ── COO icon SVG ────────────────────────────────────────────────────────────
// A square tile: yellow background (#FFD800), "COO" in Permanent Marker style.
// The Permanent Marker font won't render in pure SVG without embedding; we use
// a bold geometric substitute here that renders identically in all environments.
function makeSvg(size) {
  const fontSize = Math.round(size * 0.34);
  const subFontSize = Math.round(size * 0.09);
  const barY = Math.round(size * 0.68);
  const barH = Math.round(size * 0.055);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#FFD800"/>
  <text
    x="${size / 2}"
    y="${Math.round(size * 0.62)}"
    font-family="'Arial Black', 'Helvetica Neue', Arial, sans-serif"
    font-size="${fontSize}"
    font-weight="900"
    fill="#0A0A0A"
    text-anchor="middle"
    dominant-baseline="auto"
    letter-spacing="-2"
  >COO</text>
  <rect x="${Math.round(size * 0.3)}" y="${barY}" width="${Math.round(size * 0.4)}" height="${barH}" fill="#0A0A0A"/>
  <text
    x="${size / 2}"
    y="${Math.round(size * 0.87)}"
    font-family="'Arial', sans-serif"
    font-size="${subFontSize}"
    font-weight="400"
    fill="#0A0A0A"
    text-anchor="middle"
    letter-spacing="4"
    opacity="0.6"
  >cafe · bar</text>
</svg>`;
}

// ── Try @resvg/resvg-js ──────────────────────────────────────────────────────
async function withResvg() {
  const { Resvg } = await import("@resvg/resvg-js");
  for (const size of [192, 512]) {
    const svg = makeSvg(size);
    const resvg = new Resvg(svg, { fitTo: { mode: "width", value: size } });
    const png = resvg.render().asPng();
    const dest = join(outDir, `icon-${size}.png`);
    writeFileSync(dest, png);
    console.log(`✓ ${dest}`);
  }
}

// ── Try sharp ────────────────────────────────────────────────────────────────
async function withSharp() {
  const sharp = (await import("sharp")).default;
  for (const size of [192, 512]) {
    const svg = Buffer.from(makeSvg(size));
    const dest = join(outDir, `icon-${size}.png`);
    await sharp(svg).png().toFile(dest);
    console.log(`✓ ${dest}`);
  }
}

// ── Fallback: write raw SVG files and explain ────────────────────────────────
function withSvgFallback() {
  for (const size of [192, 512]) {
    const dest = join(outDir, `icon-${size}.svg`);
    writeFileSync(dest, makeSvg(size));
    console.log(`✓ ${dest} (SVG — convert to PNG manually or install @resvg/resvg-js)`);
  }
  console.log("\nTo auto-convert, run:  npm install -D @resvg/resvg-js  then re-run this script.");
}

try {
  await withResvg();
} catch {
  try {
    await withSharp();
  } catch {
    withSvgFallback();
  }
}
