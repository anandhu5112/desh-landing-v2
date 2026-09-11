import { computeDisplacementMap } from "liquid-glass-web-react";

/**
 * WebKit cannot run liquid-glass's full-page SVG filter. Android Chrome is
 * Blink and keeps that path. On WebKit we paint a pill-sized canvas instead.
 *
 * Goal: convincing refraction on Safari / iOS — not visual parity with Chrome.
 */
export function needsWebKitGlassFallback(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) return true;
  return /^((?!chrome|chromium|android).)*safari/i.test(ua);
}

/** @deprecated Use needsWebKitGlassFallback. */
export const needsWebKitCanvasGlass = needsWebKitGlassFallback;

const REFERENCE_DIAGONAL = Math.hypot(1440, 900);

/** Physical displacement in CSS px for the tuned `strength` knob. */
export function physicalDisplacementPx(strength: number): number {
  return (strength * REFERENCE_DIAGONAL) / Math.SQRT2;
}

/**
 * SVG `feDisplacementMap` uses `scale * (channel/255 - 0.5)`.
 * Do not use `(channel - 128) / 127` — that is ~2× stronger.
 */
export function displacementFromMapChannel(channel: number): number {
  return channel / 255 - 0.5;
}

/**
 * Specular mask matching liquid-glass: blue above 128 → white highlight,
 * then `result = specular * mask + lens` (premultiplied interpretation).
 */
export function specularFromMapChannel(channel: number): number {
  return Math.max(0, channel / 255 - 128 / 255);
}

export type CanvasRefractionParams = {
  width: number;
  height: number;
  radius: number;
  strength: number;
  chromaticAberration: number;
  blur: number;
  depth: number;
  curvature: number;
  glow: number;
  edgeHighlight: number;
  specular: number;
  pad: number;
  dpr: number;
};

type Rect = { left: number; top: number; width: number; height: number };

function intersect(a: Rect, b: Rect): Rect | null {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.left + a.width, b.left + b.width);
  const bottom = Math.min(a.top + a.height, b.top + b.height);
  if (right <= left || bottom <= top) return null;
  return { left, top, width: right - left, height: bottom - top };
}

/** object-fit: cover, object-position: center top — draw `img` into `elRect`. */
function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  el: Rect,
  view: Rect,
  dpr: number,
  opacity: number,
  position: "center top" | "center center" = "center top",
) {
  const iw =
    "naturalWidth" in img
      ? (img as HTMLImageElement).naturalWidth || (img as HTMLImageElement).width
      : (img as HTMLCanvasElement).width;
  const ih =
    "naturalHeight" in img
      ? (img as HTMLImageElement).naturalHeight || (img as HTMLImageElement).height
      : (img as HTMLCanvasElement).height;
  if (!iw || !ih) return;

  const scale = Math.max(el.width / iw, el.height / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = el.left + (el.width - dw) / 2;
  const dy =
    position === "center top" ? el.top : el.top + (el.height - dh) / 2;

  const hit = intersect(view, el);
  if (!hit) return;

  // Source crop in image pixel space.
  const sx = (hit.left - dx) / scale;
  const sy = (hit.top - dy) / scale;
  const sw = hit.width / scale;
  const sh = hit.height / scale;

  const outX = (hit.left - view.left) * dpr;
  const outY = (hit.top - view.top) * dpr;
  const outW = hit.width * dpr;
  const outH = hit.height * dpr;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(img, sx, sy, sw, sh, outX, outY, outW, outH);
  ctx.restore();
}

let skyImage: HTMLImageElement | null = null;
let sunImage: HTMLImageElement | null = null;

function ensureImage(url: string, slot: "sky" | "sun"): HTMLImageElement {
  const existing = slot === "sky" ? skyImage : sunImage;
  if (existing && existing.getAttribute("data-url") === url) {
    return existing;
  }
  const img = new Image();
  img.decoding = "async";
  img.setAttribute("data-url", url);
  img.src = url;
  if (slot === "sky") skyImage = img;
  else sunImage = img;
  return img;
}

/**
 * Paint what sits behind the padded pill while it overlaps the hero.
 * Returns false when the pill is not over the hero (caller should frost).
 */
export function paintHeroBehindPill(
  canvas: HTMLCanvasElement,
  view: Rect,
  dpr: number,
): boolean {
  const frame = document.querySelector<HTMLElement>("[data-nav-glass-frame]");
  const hero = document.querySelector<HTMLElement>("[data-nav-glass-hero]");
  if (!frame || !hero) return false;

  const heroRect = hero.getBoundingClientRect();
  if (!intersect(view, { left: heroRect.left, top: heroRect.top, width: heroRect.width, height: heroRect.height })) {
    return false;
  }

  const w = Math.max(1, Math.round(view.width * dpr));
  const h = Math.max(1, Math.round(view.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return false;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#c6e4fa";
  ctx.fillRect(0, 0, w, h);

  const frameRect = frame.getBoundingClientRect();
  const frameBox: Rect = {
    left: frameRect.left,
    top: frameRect.top,
    width: frameRect.width,
    height: frameRect.height,
  };

  // Sky (cover, center top, opacity 0.7 over the frame fill).
  const sky = ensureImage(
    window.innerWidth >= 1921
      ? "/images/hero-sky-4096.webp"
      : window.innerWidth >= 1281
        ? "/images/hero-sky-1920.webp"
        : "/images/hero-sky-1280.webp",
    "sky",
  );
  if (sky.complete && sky.naturalWidth > 0) {
    drawCoverImage(ctx, sky, frameBox, view, dpr, 0.7, "center top");
  }

  const zoom = document.querySelector<HTMLElement>("[data-nav-glass-zoom]");
  const base = document.querySelector<HTMLImageElement>("[data-nav-glass-base]");
  const sun = document.querySelector<HTMLElement>("[data-nav-glass-sun]");
  const shade = document.querySelector<HTMLElement>("[data-nav-glass-shade]");

  // Landscape + sun live inside .zoomWrap and inherit its transform.
  if (zoom) {
    const zRect = zoom.getBoundingClientRect();
    const zBox: Rect = {
      left: zRect.left,
      top: zRect.top,
      width: zRect.width,
      height: zRect.height,
    };
    if (base && base.complete && base.naturalWidth > 0) {
      drawCoverImage(ctx, base, zBox, view, dpr, 1, "center top");
    }

    if (sun) {
      const sRect = sun.getBoundingClientRect();
      const sunOpacity = Number.parseFloat(getComputedStyle(sun).opacity || "1");
      if (sunOpacity > 0.02 && sRect.width > 2) {
        const sunImg = ensureImage("/images/hero-sun.webp", "sun");
        if (sunImg.complete && sunImg.naturalWidth > 0) {
          drawCoverImage(
            ctx,
            sunImg,
            { left: sRect.left, top: sRect.top, width: sRect.width, height: sRect.height },
            view,
            dpr,
            sunOpacity,
            "center center",
          );
        }
      }
    }
  }

  if (shade) {
    const opacity = Number.parseFloat(getComputedStyle(shade).opacity || "0");
    if (opacity > 0.01) {
      const hit = intersect(view, frameBox);
      if (hit) {
        ctx.save();
        ctx.globalAlpha = opacity;
        const g = ctx.createLinearGradient(0, (hit.top - view.top) * dpr, 0, (hit.top - view.top + hit.height) * dpr);
        g.addColorStop(0, "rgba(0,20,40,0.35)");
        g.addColorStop(1, "rgba(0,20,40,0)");
        ctx.fillStyle = g;
        ctx.fillRect(
          (hit.left - view.left) * dpr,
          (hit.top - view.top) * dpr,
          hit.width * dpr,
          hit.height * dpr,
        );
        ctx.restore();
      }
    }
  }

  // Live copy on top of the reconstructed hero — without this the outro
  // ("you crossed oceans…") is invisible to the shader, so it cannot bend.
  paintLiveTextBehindPill(ctx, view, dpr);
  return true;
}

const SKIP_TEXT_CLOSEST = "#nav-pill, [data-ybouane-glass], [data-webkit-nav-glass], script, style, noscript, canvas";

function ancestorOpacity(el: HTMLElement): number {
  let opacity = 1;
  let node: HTMLElement | null = el;
  while (node && node !== document.documentElement) {
    const value = Number.parseFloat(getComputedStyle(node).opacity || "1");
    if (!Number.isFinite(value) || value <= 0.02) return 0;
    opacity *= value;
    node = node.parentElement;
  }
  return opacity;
}

export type TextRun = {
  text: string;
  left: number;
  top: number;
  font: string;
  color: string;
  opacity: number;
  letterSpacing: string;
};

/**
 * Text nodes whose layout box intersects `view`, with the computed type
 * they should be painted in. Used so the Safari canvas/WebGL backdrops can
 * refract live copy the same way Chrome's SVG filter does — without
 * html-to-image of the whole page.
 */
export function collectTextRuns(root: HTMLElement, view: Rect): TextRun[] {
  const runs: TextRun[] = [];
  const range = document.createRange();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let current = walker.nextNode(); current; current = walker.nextNode()) {
    const text = current.nodeValue?.replace(/\s+/g, " ").trim() ?? "";
    const parent = current.parentElement;
    if (!text || !parent) continue;
    if (parent.closest(SKIP_TEXT_CLOSEST)) continue;
    const style = getComputedStyle(parent);
    if (style.visibility === "hidden" || style.display === "none") continue;
    const opacity = ancestorOpacity(parent);
    if (opacity <= 0.02) continue;
    range.selectNodeContents(current);
    const rects = range.getClientRects();
    if (!rects.length) continue;
    // One box for the whole node. Nowrap headings (the outro) are a single
    // rect; wrapped text is approximated as one line at the first box so we
    // never stamp the full string onto every line.
    const r = rects[0];
    if (
      r.width < 1 ||
      r.height < 1 ||
      !intersect(view, { left: r.left, top: r.top, width: r.width, height: r.height })
    ) {
      continue;
    }
    runs.push({
      text,
      left: r.left,
      top: r.top,
      font: style.font,
      color: style.color,
      opacity,
      letterSpacing: style.letterSpacing,
    });
  }
  return runs;
}

export function drawTextRuns(
  ctx: CanvasRenderingContext2D,
  runs: TextRun[],
  view: Rect,
  dpr: number,
): void {
  if (!runs.length) return;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  for (const run of runs) {
    ctx.globalAlpha = run.opacity;
    ctx.font = run.font;
    ctx.fillStyle = run.color;
    if ("letterSpacing" in ctx) {
      (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
        run.letterSpacing;
    }
    ctx.fillText(run.text, run.left - view.left, run.top - view.top);
  }
  ctx.restore();
}

/** Paint live copy that sits in `view` onto an already-sized 2D context. */
export function paintLiveTextBehindPill(
  ctx: CanvasRenderingContext2D,
  view: Rect,
  dpr: number,
): number {
  const root = document.getElementById("page-scroll-content");
  if (!root) return 0;
  const runs = collectTextRuns(root, view);
  drawTextRuns(ctx, runs, view, dpr);
  return runs.length;
}

function isOpaqueColor(bg: string): boolean {
  if (!bg || bg === "transparent") return false;
  const match = bg.match(/rgba?\(([^)]+)\)/);
  if (!match) return true;
  const parts = match[1].split(",").map((part) => Number.parseFloat(part.trim()));
  if (parts.length < 4) return true;
  return parts[3] > 0.02;
}

/**
 * First non-transparent page fill walking up from `start`.
 * Skips the nav / glass overlay and never uses html/body — those are the
 * document's white, and reading them is how a dark panel under the pill
 * was painted as a white slab until you scrolled far enough for the
 * hit-test to miss the pill.
 */
export function opaqueBackgroundColor(start: HTMLElement | null): string | null {
  let node: HTMLElement | null = start;
  while (
    node &&
    node !== document.body &&
    node !== document.documentElement
  ) {
    if (!node.closest("#nav-pill, [data-ybouane-glass], [data-webkit-nav-glass]")) {
      const bg = getComputedStyle(node).backgroundColor;
      if (isOpaqueColor(bg)) return bg;
    }
    node = node.parentElement;
  }
  return null;
}

function pageFillColor(view: Rect): string {
  const samples: Array<[number, number]> = [
    [view.left + view.width / 2, view.top + view.height / 2],
    [view.left + view.width * 0.25, view.top + view.height / 2],
    [view.left + view.width * 0.75, view.top + view.height / 2],
  ];
  if (typeof document.elementsFromPoint !== "function") return "#ffffff";
  for (const [x, y] of samples) {
    for (const node of document.elementsFromPoint(x, y)) {
      if (!(node instanceof HTMLElement)) continue;
      const bg = opaqueBackgroundColor(node);
      if (bg) return bg;
    }
  }
  return "#ffffff";
}

function mediaIntrinsicSize(
  el: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
): { w: number; h: number } | null {
  if (el instanceof HTMLImageElement) {
    if (!el.complete || el.naturalWidth < 1) return null;
    return { w: el.naturalWidth, h: el.naturalHeight };
  }
  if (el instanceof HTMLVideoElement) {
    if (el.readyState < 2 || el.videoWidth < 1) return null;
    return { w: el.videoWidth, h: el.videoHeight };
  }
  if (el.width < 1 || el.height < 1) return null;
  return { w: el.width, h: el.height };
}

/** Draw one replaced element (img / video / canvas) into `view`. */
export function drawMediaElement(
  ctx: CanvasRenderingContext2D,
  el: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  view: Rect,
  dpr: number,
): boolean {
  const size = mediaIntrinsicSize(el);
  if (!size) return false;
  const r = el.getBoundingClientRect();
  const box: Rect = { left: r.left, top: r.top, width: r.width, height: r.height };
  if (box.width < 2 || box.height < 2) return false;
  const opacity = ancestorOpacity(el);
  if (opacity <= 0.02) return false;
  const fit = getComputedStyle(el).objectFit;
  if (fit === "cover") {
    drawCoverImage(ctx, el, box, view, dpr, opacity, "center center");
    return true;
  }
  const hit = intersect(view, box);
  if (!hit) return false;
  const sx = ((hit.left - box.left) / box.width) * size.w;
  const sy = ((hit.top - box.top) / box.height) * size.h;
  const sw = (hit.width / box.width) * size.w;
  const sh = (hit.height / box.height) * size.h;
  if (sw < 1 || sh < 1) return false;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(
    el,
    sx,
    sy,
    sw,
    sh,
    (hit.left - view.left) * dpr,
    (hit.top - view.top) * dpr,
    hit.width * dpr,
    hit.height * dpr,
  );
  ctx.restore();
  return true;
}

/**
 * Past the hero: sample the real section (fill, video, logos, copy) so the
 * shader has something to bend. A flat grey fill is what made later pages
 * look like a white slab.
 */
export function paintPageBehindPill(
  canvas: HTMLCanvasElement,
  view: Rect,
  dpr: number,
): void {
  const w = Math.max(1, Math.round(view.width * dpr));
  const h = Math.max(1, Math.round(view.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = pageFillColor(view);
  ctx.fillRect(0, 0, w, h);

  const root = document.getElementById("page-scroll-content");
  if (!root) {
    paintLiveTextBehindPill(ctx, view, dpr);
    return;
  }

  const media = root.querySelectorAll("img, video, canvas");
  for (const node of media) {
    const el = node as HTMLImageElement | HTMLVideoElement | HTMLCanvasElement;
    if (el.closest("#nav-pill, [data-ybouane-glass], [data-webkit-nav-glass]")) continue;
    drawMediaElement(ctx, el, view, dpr);
  }
  paintLiveTextBehindPill(ctx, view, dpr);
}

/**
 * Refract `source` (already includes `pad` around the lens) into `dest`.
 * Same displacement map math as liquid-glass-web-react.
 */
export function refractLensToCanvas(
  source: CanvasImageSource,
  dest: HTMLCanvasElement,
  params: CanvasRefractionParams,
): void {
  const {
    width,
    height,
    radius,
    strength,
    chromaticAberration,
    blur,
    depth,
    curvature,
    glow,
    edgeHighlight,
    specular,
    pad,
    dpr,
  } = params;

  if (width <= 0 || height <= 0) return;

  const outW = Math.max(1, Math.round(width * dpr));
  const outH = Math.max(1, Math.round(height * dpr));
  if (dest.width !== outW || dest.height !== outH) {
    dest.width = outW;
    dest.height = outH;
  }

  const srcW = Math.max(1, Math.round((width + pad * 2) * dpr));
  const srcH = Math.max(1, Math.round((height + pad * 2) * dpr));

  const scratch = document.createElement("canvas");
  scratch.width = srcW;
  scratch.height = srcH;
  const sctx = scratch.getContext("2d", { willReadFrequently: true });
  if (!sctx) return;

  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.clearRect(0, 0, srcW, srcH);
  if (blur > 0) sctx.filter = `blur(${blur * dpr}px)`;
  sctx.drawImage(source, 0, 0, srcW, srcH);
  sctx.filter = "none";

  const srcData = sctx.getImageData(0, 0, srcW, srcH);
  const hw = width / 2;
  const hh = height / 2;
  // Match the library's default map resolution for smoother rim fold.
  const mapSize = 256;
  const map = computeDisplacementMap({
    size: mapSize,
    halfWidth: hw,
    halfHeight: hh,
    radius,
    depth,
    domeDepth: Math.max(0, Math.min(1, curvature)) * Math.min(hw, hh),
    splay: 1,
    glow,
    glowSpread: 1,
    glowExponent: 1.5,
    edgeHighlight,
    edgeWidth: 3,
    edgeExponent: 1.5,
    specularAngle: 45,
  });

  // Same physical scale Chrome passes to feDisplacementMap after glassStrengthScale.
  const scale = physicalDisplacementPx(strength) * dpr;
  const c = chromaticAberration;
  const scales = [scale * (1 + 0.2 * c), scale * (1 + 0.1 * c), scale];

  const out = sctx.createImageData(outW, outH);
  const padPx = pad * dpr;
  const mapScaleX = (mapSize - 1) / Math.max(1, outW - 1);
  const mapScaleY = (mapSize - 1) / Math.max(1, outH - 1);

  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const mx = x * mapScaleX;
      const my = y * mapScaleY;
      const r = sampleMapChannel(map, mapSize, mx, my, 0);
      const g = sampleMapChannel(map, mapSize, mx, my, 1);
      const b = sampleMapChannel(map, mapSize, mx, my, 2);
      const a = sampleMapChannel(map, mapSize, mx, my, 3);
      const dx = displacementFromMapChannel(r);
      const dy = displacementFromMapChannel(g);
      const highlight = specularFromMapChannel(b) * specular;

      const oi = (y * outW + x) * 4;
      // Outside the rounded lens the map alpha is 0 — leave transparent so the
      // host's border-radius shows the unrefracted page through the corners.
      if (a < 8) {
        out.data[oi] = out.data[oi + 1] = out.data[oi + 2] = out.data[oi + 3] = 0;
        continue;
      }

      for (let ch = 0; ch < 3; ch++) {
        const sx = padPx + x + dx * scales[ch];
        const sy = padPx + y + dy * scales[ch];
        out.data[oi + ch] = sampleBilinear(srcData.data, srcW, srcH, sx, sy, ch);
      }
      out.data[oi + 3] = 255;
      if (highlight > 0) {
        const add = highlight * 255;
        for (let ch = 0; ch < 3; ch++) {
          out.data[oi + ch] = Math.min(255, out.data[oi + ch] + add);
        }
      }
    }
  }

  const dctx = dest.getContext("2d");
  if (!dctx) return;
  dctx.setTransform(1, 0, 0, 1, 0, 0);
  dctx.putImageData(out, 0, 0);
}

/** Bilinear sample of a square RGBA displacement map. */
function sampleMapChannel(
  map: Uint8ClampedArray,
  size: number,
  x: number,
  y: number,
  channel: number,
): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(size - 1, x0 + 1);
  const y1 = Math.min(size - 1, y0 + 1);
  const fx = x - x0;
  const fy = y - y0;
  const cx0 = Math.max(0, Math.min(size - 1, x0));
  const cy0 = Math.max(0, Math.min(size - 1, y0));
  const i00 = (cy0 * size + cx0) * 4 + channel;
  const i10 = (cy0 * size + x1) * 4 + channel;
  const i01 = (y1 * size + cx0) * 4 + channel;
  const i11 = (y1 * size + x1) * 4 + channel;
  return (
    map[i00] * (1 - fx) * (1 - fy) +
    map[i10] * fx * (1 - fy) +
    map[i01] * (1 - fx) * fy +
    map[i11] * fx * fy
  );
}

function sampleBilinear(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  x: number,
  y: number,
  channel: number,
): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(w - 1, x0 + 1);
  const y1 = Math.min(h - 1, y0 + 1);
  const fx = x - x0;
  const fy = y - y0;
  const cx0 = Math.max(0, Math.min(w - 1, x0));
  const cy0 = Math.max(0, Math.min(h - 1, y0));
  const i00 = (cy0 * w + cx0) * 4 + channel;
  const i10 = (cy0 * w + x1) * 4 + channel;
  const i01 = (y1 * w + cx0) * 4 + channel;
  const i11 = (y1 * w + x1) * 4 + channel;
  return (
    data[i00] * (1 - fx) * (1 - fy) +
    data[i10] * fx * (1 - fy) +
    data[i01] * (1 - fx) * fy +
    data[i11] * fx * fy
  );
}
