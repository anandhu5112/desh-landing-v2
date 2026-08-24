#!/usr/bin/env node
/**
 * Generate WebP siblings for the raster images in public/, at the sizes they
 * are actually displayed.
 *
 * next.config.ts sets output: "export" with images.unoptimized: true — a
 * static export has no server, so Next's image optimizer never runs and
 * every byte in public/ ships to the browser exactly as authored. Nothing
 * catches an 8MB PNG on its way in, and nothing resizes a 927px file down to
 * the 30px circle it renders as. This script is that check.
 *
 * Sources are never modified. Each entry below produces one or more
 * <name>-<width>.webp (or <name>.webp for single-width entries) beside the
 * original, and references opt in explicitly — via <picture><source> for
 * <img>, or the two-declaration image-set() fallback for CSS backgrounds
 * (Hero.tsx and Hero.module.css have one of each). The original stays as the
 * fallback for browsers that can't decode WebP.
 *
 *   npm run optimize:images          # build what's stale
 *   npm run optimize:images -- --all # ignore mtimes, rebuild everything
 */
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IMAGES = path.join(ROOT, "public/images");

// Measured against hero-bg.png, comparing only pixels that actually render
// (RGB under a fully transparent pixel is undefined and never painted):
// q92 scores 44.1dB PSNR with a worst-case error of 14/255 — visually
// indistinguishable — while still cutting that file by 87%. q80 scored
// 37.6dB, under the ~40dB threshold where differences start being visible on
// a good monitor. alphaQuality 100 keeps the alpha channel bit-exact, which
// matters: the hero's hills have to stay fully opaque or the sun shows
// through them.
const WEBP = { quality: 92, alphaQuality: 100, effort: 6 };

/**
 * Widths to emit per image, chosen from how large each one actually renders
 * — NOT from how large the source happens to be. `null` means "leave at
 * native size".
 *
 * The rule for a fixed-size element is display px × 3, covering a 3x phone;
 * for full-bleed art it's a set of widths spanning phone to desktop, offered
 * through srcset so each device pulls only what it needs.
 */
const PLAN = {
  // Full-bleed hero art. 1280 covers phones (even at 3x, since it's
  // clipped to a 32px-inset frame), 1920 laptops, native for large displays.
  "hero-bg.png": [1280, 1920, null],
  "hero-sky.png": [1280, 1920, null],
  // Footer scene spans the viewport at the page bottom. Already WebP, so
  // only the downscales are worth generating — re-encoding it at native
  // width came out 3KB *larger* than the source. The original serves as the
  // top of its own srcset.
  "footer-scene.webp": [1280, 1920],
  // Rendered as 30x30 circles (BloomSection.module.css .avatarImg, and the
  // width/height props on the <Image>). 90px covers a 3x phone. These are
  // the worst offenders on the site: 2.1MB of source for four small circles.
  "join-avatar-1.png": [90],
  "join-avatar-2.png": [90],
  "join-avatar-3.png": [90],
  "join-avatar-4.png": [90],
};

// Only convert unplanned files above this size — below it a WebP rarely wins
// enough to justify a second file on disk.
const MIN_UNPLANNED_BYTES = 100 * 1024;

const force = process.argv.includes("--all");
const kb = (n) => (n / 1024).toFixed(0).padStart(6) + " KB";

/** True when dst is missing or older than src. */
async function isStale(src, dst) {
  if (force) return true;
  try {
    const [a, b] = await Promise.all([stat(src), stat(dst)]);
    return a.mtimeMs > b.mtimeMs;
  } catch {
    return true;
  }
}

const rows = [];
let saved = 0;
let skipped = 0;

const entries = await readdir(IMAGES, { withFileTypes: true });

for (const entry of entries) {
  if (!entry.isFile()) continue;
  const name = entry.name;

  // " 2.png" duplicates litter this repo; converting them doubles the
  // clutter and no reference will ever point at the result.
  if (/ \d+\.[a-z]+$/i.test(name)) continue;
  if (!/\.(png|jpe?g|webp)$/i.test(name)) continue;

  const src = path.join(IMAGES, name);
  const base = name.replace(/\.[^.]+$/, "");
  const planned = PLAN[name];

  const { size: srcSize } = await stat(src);
  if (!planned && (srcSize < MIN_UNPLANNED_BYTES || /\.webp$/i.test(name))) {
    continue;
  }

  const meta = await sharp(src).metadata();
  // null = native width. Drop any width that would upscale.
  const widths = (planned ?? [null]).filter(
    (w) => w === null || w <= meta.width
  );

  for (const w of widths) {
    const single = widths.length === 1;
    const dst = path.join(IMAGES, single ? `${base}.webp` : `${base}-${w ?? meta.width}.webp`);
    if (path.resolve(dst) === path.resolve(src)) continue; // don't clobber a .webp source

    if (!(await isStale(src, dst))) {
      skipped++;
      continue;
    }

    const pipeline = sharp(src);
    if (w !== null) pipeline.resize({ width: w, withoutEnlargement: true });
    await pipeline.webp(WEBP).toFile(dst);

    const after = (await stat(dst)).size;
    // Only the largest variant displaces the original; the smaller ones are
    // additional files, so don't double-count them as savings.
    if (w === null || w === Math.max(...widths.map((x) => x ?? meta.width))) {
      saved += srcSize - after;
    }
    rows.push([path.relative(ROOT, dst), srcSize, after, w ?? meta.width]);
  }
}

if (!rows.length) {
  console.log(`Nothing to do (${skipped} already current).`);
} else {
  rows.sort((a, b) => b[1] - a[1] || b[3] - a[3]);
  for (const [name, before, after, w] of rows) {
    const pct = (100 - (after / before) * 100).toFixed(0);
    console.log(`${kb(before)} -> ${kb(after)}  ${String(pct).padStart(3)}%  ${String(w).padStart(4)}w  ${name}`);
  }
  console.log(
    `\n${rows.length} written, ${skipped} current — ${(saved / 1024 / 1024).toFixed(1)} MB off the largest variants.`
  );
  console.log("Sources kept as fallbacks; update references to opt in.");
}
