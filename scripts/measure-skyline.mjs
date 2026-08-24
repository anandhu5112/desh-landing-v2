#!/usr/bin/env node
/**
 * Measure where hero-bg's landscape stops being transparent — its skyline —
 * as a fraction of the artwork's own height, sampled left to right.
 *
 * Hero.tsx centres the outro statement on the part of the sun that is
 * actually visible, and what hides the rest of it is this image: the sun
 * paints at z-index 4 and .heroBaseImg at 5, so every opaque pixel of hill,
 * river and foreground covers the circle behind it. Where that coverage
 * begins is a property of the artwork, not of the viewport, so it is
 * measured once here and mapped onto whatever the viewport turns out to be
 * at runtime (see HERO_SKYLINE and horizonAt in Hero.tsx).
 *
 * The profile is x-dependent on purpose. A single number cannot describe
 * this scene: the river valley in the middle of the frame lets the sun show
 * ~13% of the image's height further down than the hills on either side of
 * it do, and the sun spans both.
 *
 * Prints a ready-to-paste array. Re-run and paste into Hero.tsx whenever the
 * hero artwork changes:
 *
 *   node scripts/measure-skyline.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Any of the exported widths gives the same fractions — same artwork, same
// aspect. The 1920 is the middle one and decodes fast.
const SOURCE = path.join(ROOT, "public/images/hero-bg-1920.webp");

// A pixel counts as covering the sun once it is this opaque. The skyline is
// antialiased and hazes into the sky over a few rows; 200/255 puts the
// boundary where the artwork reads as solid ground rather than at the first
// faint pixel of haze.
const OPAQUE = 200;

// Samples across the width. The skyline is smooth — two hill crests and the
// valley between them — so this resolves its shape with room to spare, and
// Hero.tsx interpolates between samples anyway.
const SAMPLES = 33;

const { data, info } = await sharp(SOURCE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

const profile = [];
for (let i = 0; i < SAMPLES; i++) {
  const x = Math.round((i / (SAMPLES - 1)) * (width - 1));
  let y = 0;
  while (y < height && data[(y * width + x) * channels + 3] < OPAQUE) y++;
  profile.push(y / height);
}

const rows = [];
for (let i = 0; i < profile.length; i += 8) {
  rows.push("  " + profile.slice(i, i + 8).map((v) => v.toFixed(3)).join(", ") + ",");
}

console.log(`// Measured from ${path.basename(SOURCE)} (${width}x${height}).`);
console.log("const HERO_SKYLINE = [");
console.log(rows.join("\n").replace(/,$/, ""));
console.log("];");
