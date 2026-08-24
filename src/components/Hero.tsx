"use client";

import { Fragment, useRef, useState, type CSSProperties } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Button from "@/components/ui/Button";
import { heroIntroSettledRef } from "@/lib/heroProgress";
import { heroScrub } from "@/lib/scrollTuning";
import styles from "./Hero.module.css";

// The landscape at three widths, so a phone isn't made to download a
// desktop-sized file. The browser picks from this using the `sizes` hint
// below; the PNG is a 3.4MB fallback only pre-2020 browsers ever pull.
// Regenerate with `npm run optimize:images`.
const HERO_BG_SRCSET = [
  "/images/hero-bg-1280.webp 1280w",
  "/images/hero-bg-1920.webp 1920w",
  "/images/hero-bg-3856.webp 3856w",
].join(", ");
const HERO_BG_PNG = "/images/hero-bg.png";
// The image fills the viewport apart from .heroFrame's inset, so viewport
// width is the right measure. Stated explicitly because the browser picks a
// candidate before layout exists, and would otherwise assume full width and
// over-fetch on small screens.
const HERO_BG_SIZES = "100vw";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger);
}

// The pin covers exactly the zoom/outro sequence. GrowSection/UsSection are
// regular vertical sections below Hero now, not additional pinned stages.
//
// Its pacing is stated once, here: every beat is written in timeline units
// and converted to scroll through this single rate — percent of viewport
// height per unit. The alternative, giving each beat a share of a fixed
// scroll range, is what this replaces, and the two are not interchangeable.
// A scrubbed timeline's length is whatever its last beat ends at, so under
// the old scheme lengthening any one beat stretched the range every *other*
// beat had to share and quietly sped all of them up. Deriving the range from
// the rate instead means a beat can be re-timed on its own and nothing else
// changes pace at all.
//
// This is the rate the whole sequence was tuned at. Raising it slows
// everything down together; individual beats are re-timed by their own
// durations below.
const SCROLL_PCT_PER_UNIT = 177;

// Opening beat: the hero holds still before heroContent starts leaving. The
// hero frame itself no longer animates — it's a static 32px margin (see
// .heroFrame) that the whole interaction plays inside — but this beat still
// paces what follows.
const INTRO_HOLD_DURATION = 0.2;

// The zoom's own slot. Named rather than left inline in the tween because
// the sun's rise starts exactly where this ends (see SUN_RISE_STARTS_AT),
// and that relationship should be visible in one place.
const ZOOM_STARTS_AT = 0.1;
const ZOOM_DURATION = 0.4;

// Stillness after the sun finishes rising. The hero stays pinned for this
// much further scrolling with nothing moving at all — the completed scene
// (sun up, outro statement) simply holds while the reader keeps scrolling,
// then releases.
//
// This is a *hold*, not a scroll lock. An earlier version froze Lenis for a
// fixed 1.5s, which takes control away from the reader; this keeps scrolling
// entirely normal and merely leaves the picture where it is, the way a
// `position: sticky` section does. Without it the sun settles on the pin's
// very last frame and the scene is pulled away the instant it completes.
// Stated in scroll rather than in units because what it is worth is a
// distance the reader travels, not a share of the animation.
const HOLD_SCROLL_PCT = 60;
const HOLD_DURATION = HOLD_SCROLL_PCT / SCROLL_PCT_PER_UNIT;

// Third round of tuning this pair: 1.6/30 (original) zoomed in too
// aggressively by the time the sun/outro settled; 1.05/5 (round two)
// corrected that but was then overridden to 1.45/22 (round three) against
// a different, more-zoomed reference. A later, more specific reference
// confirmed near-1x — essentially the hero's own starting framing — is
// actually the intended stop point, so this reverts to round two's
// values. Also no longer needs to double as "the framing while the sun
// is still rising": the sun tween below now only starts once this one
// has fully finished (see the duration on the zoom .to() call), so
// there's no overlap state to account for.
const ZOOM_SCALE = 1.05;
const ZOOM_Y_PERCENT = 5;

// Same breakpoint the site's CSS already treats as "true phone", not the
// 1024px tablet one. Read once at tween-setup time (not reactively on
// resize, same tradeoff every other viewport-width check in this codebase
// makes) — only gates the two values below, so nothing else in the timeline
// changes shape between mobile and desktop.
const MOBILE_QUERY = "(max-width: 767px)";
// This dampened pair existed only because the old desktop target (1.45/22)
// pushed the hills at the bottom of the grassland image below the frame's
// own bottom edge on tall/narrow viewports (overflow: hidden clips it
// there, see .heroFrame). Desktop's own new target (see ZOOM_SCALE above)
// is now gentler than this pair ever was, so mobile just reuses it
// outright rather than keeping a second, now-backwards-dampened set of
// numbers — re-split these if a live check on a real tall viewport shows
// the hills clipping again.
const ZOOM_SCALE_MOBILE = ZOOM_SCALE;
const ZOOM_Y_PERCENT_MOBILE = ZOOM_Y_PERCENT;

// Split so the entrance can stagger word by word. The first word's opening
// letter becomes the script drop cap (see the render below), so this must
// stay in reading order and the first entry must be the one that carries it.
const HEADING_WORDS = ["Invest", "like", "a", "true", "global", "citizen"];

// The rise: one continuous climb from outside the frame to the sun's settled
// position, filling the slot between the zoom landing and the sun arriving.
//
// It used to be two tweens — a linear "lead-in" from outside the frame, then
// an eased beat covering 120% of the sun's own height — on the reasoning
// that the join between them happened below the frame, where a change of
// pace could not be seen. That reasoning was wrong. The sun rests at top:
// 47% with margin-top: -size/2, so the distance it has to travel is
// 0.53 * frameHeight + size/2, and that is larger than 1.2 sun-heights at
// every viewport this site supports: the join actually landed 67px into
// view on a 1710x960 desktop and ~180px into view on a phone. The two beats
// share an average speed but not a velocity — linear hands over at 1x while
// power1.out starts at 2x — so the sun crested the frame gently and then
// doubled its speed in plain sight. That was the "sun comes up too quickly":
// not the average pace so much as a hard kink right where the eye had just
// found it.
//
// One tween and one ease cannot have a kink. Travel is the visible climb
// exactly — from the horizon to the settled position (see sunHorizonFor) —
// so the curve below shapes all of the motion the reader sees, and none of
// it is spent out of sight.
//
// 0.8 is set against the curve's peak rather than picked by feel. An in-out
// quadratic tops out at twice its average speed in the middle, and at this
// duration that peak lands at roughly 1px of sun per 1px scrolled across
// every viewport — so at its very fastest the sun keeps pace with the
// gesture driving it and never outruns it, and it is slower than that
// everywhere else. Raise this to slow the rise further; the pin grows to
// match and nothing else re-times.
const SUN_RISE_DURATION = 0.8;

// Not tuned independently — the sun leaves the moment the zoom lands, so
// there is never a beat where both are moving. Everything downstream (the
// outro's reveal, the hold, the pin's length) hangs off where this puts the
// sun's arrival.
const SUN_RISE_STARTS_AT = ZOOM_STARTS_AT + ZOOM_DURATION;
const SUN_SETTLE_AT = SUN_RISE_STARTS_AT + SUN_RISE_DURATION;

// The timeline is as long as its last beat, and the pin is as long as the
// timeline costs. Both derived, so re-timing any beat above carries the pin
// with it instead of squeezing the others.
const TIMELINE_UNITS = SUN_SETTLE_AT + HOLD_DURATION;
const PIN_END = `+=${(TIMELINE_UNITS * SCROLL_PCT_PER_UNIT).toFixed(1)}%`;

/**
 * A position in timeline units, as ScrollTrigger's own 0..1 progress.
 *
 * Worth having as a function rather than open-coded per constant: both
 * callers below used to divide by the pin's scroll range as though one
 * timeline unit cost ZOOM_SCROLL_PCT of it, which was true only before the
 * hold was appended to the timeline. After that the outro revealed about a
 * sixth of the range early — while the sun was still two-thirds of the way
 * up, positioned for where it was going to stop — and SiteNav released
 * slightly before the intro had actually settled.
 */
const progressAt = (unit: number) => unit / TIMELINE_UNITS;

// Progress at which the second-section statement reveals: exactly as the sun
// arrives, which is the whole point of it.
const OUTRO_REVEAL_AT = progressAt(SUN_SETTLE_AT);

// The opening beat's end, for SiteNav (see heroProgress.ts) — derived, not
// hand-copied, so it can't drift out of sync.
const HERO_INTRO_SETTLED_PROGRESS = progressAt(INTRO_HOLD_DURATION);

// Soft at both ends: the sun eases up out of the horizon, carries through
// the middle, and settles rather than stopping. Linear ("none") is the usual
// default for a scrubbed tween because it maps distance to scroll 1:1, but
// on the single largest, slowest move on the page that reads as mechanical.
// An out-curve alone only fixes the arrival and leaves the sun bursting into
// frame at twice its average speed, which is the half of this the previous
// version got wrong.
//
// power1 (quadratic), not something heavier: an in-out curve peaks in the
// middle at (curve order) times its average speed, so quadratic tops out at
// 2x while cubic would hit 3x — and past about 2x the sun stops feeling like
// it is being carried by the scroll and starts feeling like it is playing a
// clip of its own.
const SUN_RISE_EASE = "power1.inOut";

// How much of the sun's radius the outro statement is allowed to occupy.
// Applied to the radius rather than to a width or a font size, so it reads
// as one uniform ring of clearance between the copy's corners and the
// circle's edge at every viewport. 1 would let the text touch the curve;
// 0.9 keeps the visible gap the design has always wanted without shrinking
// the copy enough to look timid inside the shape.
const OUTRO_CIRCLE_FIT = 0.9;

/**
 * Carry the hero copy's entrance across ScrollTrigger's pin swaps.
 *
 * `pin: true` wraps <main> in a .pin-spacer, and every refresh swaps that
 * spacer out and back in. Moving a node in the DOM restarts every CSS
 * animation inside it — not resumed, but re-created as fresh Animation
 * objects at time zero — so the copy's fade/blur entrance visibly replayed
 * from the top each time, reading as the text flickering twice.
 *
 * The entrance begins at first paint, before any of this code runs, so the
 * fix is to re-seed whatever animations now exist with how long it has
 * really been going. Only ever fast-forwards, so a live animation is never
 * rewound.
 */
function resyncEntrance(container: HTMLElement, originMs: number) {
  const elapsed = performance.now() - originMs;
  for (const anim of container.getAnimations({ subtree: true })) {
    if (Number(anim.currentTime) < elapsed) anim.currentTime = elapsed;
  }
}

/**
 * Distance, in px, that puts the sun's top edge exactly on the frame's
 * bottom edge — i.e. fully outside it, where .heroFrame's overflow: hidden
 * clips it away.
 *
 * This is the crux of the flash fix. The sun's resting offset used to be
 * 120% of its own height, which leaves ~94px of it *inside* the frame; it
 * only looked hidden because .heroBaseImg's opaque hills painted over it.
 * That made the sun's concealment depend on a network resource, so on a
 * cold load it flashed as a yellow arc along the bottom of the frame until
 * the image decoded. Clearing the frame outright means nothing has to cover
 * it, and the sun can stay permanently visible — no reveal, no gating.
 *
 * offsetTop is layout position and ignores transforms, so this reads the
 * same whether or not GSAP has already moved the element.
 */
function sunClearanceFor(sun: HTMLElement, frame: HTMLElement) {
  // +1 for sub-pixel rounding, so the top edge can't land a fraction short.
  return frame.clientHeight - sun.offsetTop + 1;
}

/**
 * The offset that puts the sun's top edge on the frame's bottom edge *as
 * drawn* — after .zoomWrap's settled scale and pan, not before it.
 *
 * These are two different places, and the gap between them is why the sun
 * used to appear already moving. sunClearanceFor works in the sun's own
 * layout coordinates, where the frame's bottom edge is at frame.clientHeight.
 * But the sun is inside .zoomWrap, and by the time it rises that wrapper has
 * scaled to 1.05 about the frame's centre and panned down 5% — which carries
 * the sun a further ~69px below the edge on a 1710x960 desktop. A rise that
 * starts from the untransformed clearance therefore spends the opening of
 * its ease climbing back to the horizon, out of sight, and by the time the
 * sun crosses into view it is already a fifth of the way up and travelling.
 * Starting here instead puts the ease's gentle opening where it can be seen:
 * the sun emerges from a standstill.
 *
 * Solving transformed(offsetTop + y) = frameHeight for y, where
 * transformed(p) = frameHeight / 2 + (p - frameHeight / 2) * scale +
 * (yPercent / 100) * frameHeight. Always smaller than the untransformed
 * clearance for any scale >= 1 and downward pan, so the sun is never asked
 * to start lower than it already rests; min() states that rather than
 * trusting it.
 */
function sunHorizonFor(
  sun: HTMLElement,
  frame: HTMLElement,
  zoomScale: number,
  zoomYPercent: number
) {
  const frameHeight = frame.clientHeight;
  return Math.min(
    sunClearanceFor(sun, frame),
    frameHeight / 2 + (frameHeight * (0.5 - zoomYPercent / 100)) / zoomScale - sun.offsetTop
  );
}

/**
 * The hero artwork's skyline: where the landscape stops being transparent
 * and starts covering the sun, as a fraction of the artwork's own height,
 * sampled left to right. Generated by scripts/measure-skyline.mjs — re-run
 * it and paste the result here whenever the hero image changes.
 *
 * The sun paints at z-index 4 and .heroBaseImg at 5, so every opaque pixel
 * of hill and river hides the circle behind it. This is the line where that
 * starts, and it is x-dependent for a reason: the valley in the middle of
 * the frame lets the sun show ~13% of the image's height further down than
 * the hills flanking it do, and the sun is wide enough to span both.
 */
// Measured from hero-bg-1920.webp (1920x1076).
const HERO_SKYLINE = [
  0.591, 0.581, 0.575, 0.576, 0.555, 0.541, 0.535, 0.546,
  0.557, 0.551, 0.534, 0.549, 0.579, 0.601, 0.612, 0.619,
  0.641, 0.626, 0.589, 0.583, 0.554, 0.540, 0.526, 0.533,
  0.524, 0.542, 0.572, 0.595, 0.595, 0.576, 0.549, 0.528,
  0.528,
];

// Fallback shape for the artwork, used only if the geometry is measured
// before the <img> has loaded and reported its own natural size. Same file
// the profile above was measured from; the export widths all share it.
const HERO_ART_ASPECT = 1920 / 1076;

// Columns sampled across the sun when working out how much of it the
// landscape leaves showing. Enough to resolve the skyline's own shape
// (the profile above is 33 samples across the full frame, and the sun
// covers a fraction of that) without making a resize measurably slower.
const VISIBLE_SUN_COLUMNS = 64;

/** The skyline's height, as a fraction of the artwork, at a fraction across it. */
function skylineAt(fraction: number) {
  const t = Math.min(1, Math.max(0, fraction)) * (HERO_SKYLINE.length - 1);
  const i = Math.min(HERO_SKYLINE.length - 2, Math.floor(t));
  return HERO_SKYLINE[i] + (HERO_SKYLINE[i + 1] - HERO_SKYLINE[i]) * (t - i);
}

/**
 * Where the artwork sits inside the frame, and what that puts the skyline at.
 *
 * .heroBaseImg is object-fit: cover, object-position: center top, in a box
 * that is the frame's own (it is inset: 0 inside .zoomWrap, which is inset: 0
 * inside the frame). So the artwork is scaled to cover, centred horizontally,
 * and flush to the top — any vertical overflow is cropped off the bottom,
 * which is what keeps the skyline at a consistent height across aspect ratios
 * (see .heroBaseImg's own comment).
 *
 * Both the sun and the landscape live inside .zoomWrap, so both are subject
 * to its settled scale and pan. toFrameY applies that mapping; horizonAt
 * inverts it horizontally, to ask the profile what the skyline is doing at a
 * given point on screen.
 */
function heroArtGeometry(
  frame: HTMLElement,
  art: { width: number; height: number },
  zoomScale: number,
  zoomYPercent: number
) {
  const frameWidth = frame.clientWidth;
  const frameHeight = frame.clientHeight;
  const cover = Math.max(frameWidth / art.width, frameHeight / art.height);
  const drawWidth = art.width * cover;
  const drawHeight = art.height * cover;
  const drawLeft = (frameWidth - drawWidth) / 2;

  const toFrameY = (localY: number) =>
    frameHeight / 2 + (localY - frameHeight / 2) * zoomScale + (zoomYPercent / 100) * frameHeight;
  const toLocalX = (x: number) => frameWidth / 2 + (x - frameWidth / 2) / zoomScale;
  const horizonAt = (x: number) =>
    toFrameY(skylineAt((toLocalX(x) - drawLeft) / drawWidth) * drawHeight);

  return { frameWidth, frameHeight, toFrameY, horizonAt };
}

/**
 * How far below its CSS resting position the sun settles, in its own
 * untransformed pixels — the offset the rise tween ends on.
 *
 * The rule is that the sun comes to rest half risen: the highest ground it
 * has to clear sits on its centre line, so the flanking hills cut it at its
 * equator and the valley between them shows a little more. Before this it
 * settled wherever `top: 47%` happened to put it, which cleared that ground
 * by a fifth of the sun's radius and read as a whole sun hanging above the
 * landscape rather than a sunrise still in progress.
 *
 * Measured against the crest rather than the valley, and across the sun's own
 * width rather than the frame's, because that is the piece of ground the eye
 * reads the sun as sitting behind. Doing it from the artwork means it holds
 * at every viewport: `cover` moves the skyline as the frame's aspect changes,
 * and this moves the sun with it.
 *
 * Clamped so it can only ever move the sun *down*. On a viewport where the
 * skyline already sits above the sun's resting centre, the designed position
 * stands — the sun is never pushed higher than CSS asked for.
 */
function sunSettleFor(
  sun: HTMLElement,
  frame: HTMLElement,
  art: { width: number; height: number },
  zoomScale: number,
  zoomYPercent: number
) {
  const geometry = heroArtGeometry(frame, art, zoomScale, zoomYPercent);
  const radius = (sun.offsetHeight * zoomScale) / 2;
  const centreX = geometry.frameWidth / 2;

  let crest = Infinity;
  for (let i = 0; i < VISIBLE_SUN_COLUMNS; i++) {
    const offset = ((i + 0.5) / VISIBLE_SUN_COLUMNS) * 2 - 1;
    crest = Math.min(crest, geometry.horizonAt(centreX + offset * radius));
  }

  const restingCentre = geometry.toFrameY(sun.offsetTop + sun.offsetHeight / 2);
  // Back out of the zoom: the tween moves the sun in its own coordinates,
  // and .zoomWrap magnifies whatever it does by zoomScale.
  return Math.max(0, (crest - restingCentre) / zoomScale);
}

/**
 * The centre of the part of the sun a reader can actually see: the yellow
 * above the hills, not the whole circle.
 *
 * Those are different points, and the difference is large — the landscape
 * eats the bottom of the circle, so the true centre sits low in what is left
 * and the statement reads as sinking into the hills. This returns the area
 * centroid of the visible region, which is the middle of the shape as drawn,
 * whatever the viewport does to it.
 *
 * The region is found by walking columns across the sun. Each column shows
 * yellow from the circle's top edge (or the frame's, if the sun has grown
 * past it) down to whichever comes first: the circle's bottom edge, the
 * skyline, or the frame's bottom. Column width is uniform, so it cancels out
 * of the centroid and never appears.
 *
 * Returns null when nothing is visible at all — a degenerate viewport where
 * the landscape covers the whole circle — so the caller can fall back to the
 * geometric centre rather than divide by an empty area.
 */
function visibleSunCentre(
  centreX: number,
  centreY: number,
  radius: number,
  geometry: ReturnType<typeof heroArtGeometry>
) {
  const { frameHeight, horizonAt } = geometry;

  let area = 0;
  let moment = 0;
  for (let i = 0; i < VISIBLE_SUN_COLUMNS; i++) {
    // Sample at column centres, so neither edge of the circle is weighted twice.
    const offset = ((i + 0.5) / VISIBLE_SUN_COLUMNS) * 2 - 1;
    const halfChord = radius * Math.sqrt(Math.max(0, 1 - offset * offset));
    const top = Math.max(centreY - halfChord, 0);
    const bottom = Math.min(centreY + halfChord, horizonAt(centreX + offset * radius), frameHeight);
    if (bottom <= top) continue;
    area += bottom - top;
    moment += ((bottom + top) / 2) * (bottom - top);
  }

  return area > 0 ? moment / area : null;
}

/**
 * Ties the outro statement to the sun: centred on the visible part of the
 * circle, and small enough to sit inside it. Writes three custom properties
 * on .hero, which Hero.module.css consumes — see .heroOutro, .heroOutroInner
 * and .heroOutroText for what each one does there.
 *
 * This exists because the relationship is genuinely geometric and CSS cannot
 * express it. The sun's centre is --sun-size (a vw) resolved through .sun's
 * percentage `top` and then through .zoomWrap's settled scale/pan, so it
 * depends on viewport width and height together; how much of it the
 * landscape leaves showing depends on where `cover` puts the artwork, which
 * depends on the frame's aspect ratio; and the size that fits inside a
 * circle depends on the text's own rendered width, which depends on the
 * font. Every previous attempt was a constant fitted to one viewport — a px
 * offset, then a linear fit over 1280–1920px, then per-breakpoint escapes
 * for where those stopped holding.
 *
 * Everything here is read from layout, not from getBoundingClientRect on the
 * animated elements: offsetTop/offsetHeight ignore transforms, so this is
 * correct at any point in the timeline — including at setup, when the sun is
 * still parked below the frame — and never forces a sync reflow off GSAP's
 * own writes. The end-state transform is reconstructed from the same
 * constants the zoom tween animates to, so the two cannot drift.
 */
function syncOutroToSun(
  hero: HTMLElement,
  sun: HTMLElement,
  frame: HTMLElement,
  text: HTMLElement,
  baseImg: HTMLImageElement | null,
  zoomScale: number,
  zoomYPercent: number
) {
  const frameWidth = frame.clientWidth;
  const frameHeight = frame.clientHeight;
  if (!frameWidth || !frameHeight) return;

  // Where the sun lands once the zoom has finished. .zoomWrap is inset: 0 in
  // the frame with transform-origin: center, so scaling maps a point at `y`
  // to frameHeight / 2 + (y - frameHeight / 2) * scale, and yPercent is a
  // share of the wrap's own height, which is the frame's. The sun's rise
  // tween ends at y: 0, so it contributes nothing here — by the time the
  // statement is visible the sun is at its layout position, scaled.
  //
  // Horizontal needs no equivalent: the sun is centred on the frame and the
  // zoom's origin is the frame's centre too, so it scales in place and CSS
  // centring already lands on it.
  // naturalWidth is 0 until the image has decoded; the constant is the same
  // artwork, and a load listener re-runs this with the real numbers.
  const art =
    baseImg?.naturalWidth && baseImg.naturalHeight
      ? { width: baseImg.naturalWidth, height: baseImg.naturalHeight }
      : { width: HERO_ART_ASPECT, height: 1 };
  const geometry = heroArtGeometry(frame, art, zoomScale, zoomYPercent);

  const radius = (sun.offsetHeight * zoomScale) / 2;
  const centreX = frameWidth / 2;
  // Where the sun comes to rest — its layout position plus the settle offset
  // the rise tween ends on, so this stays in step with the animation rather
  // than assuming the sun stops at `top: 47%`.
  const centreY = geometry.toFrameY(
    sun.offsetTop + sunSettleFor(sun, frame, art, zoomScale, zoomYPercent) + sun.offsetHeight / 2
  );

  const visibleCentre = visibleSunCentre(centreX, centreY, radius, geometry) ?? centreY;

  hero.style.setProperty("--sun-offset-y", `${visibleCentre - frameHeight / 2}px`);

  // The lines are display: block, so their boxes are the container's width,
  // not the text's. A Range over each line's contents measures what is
  // actually painted, without having to mutate layout to find out.
  const lines = Array.from(text.querySelectorAll<HTMLElement>(`.${styles.heroOutroLine}`));
  if (lines.length === 0) return;

  const range = document.createRange();
  let widest = 0;
  for (const line of lines) {
    range.selectNodeContents(line);
    widest = Math.max(widest, range.getBoundingClientRect().width);
  }

  const currentSize = Number.parseFloat(getComputedStyle(text).fontSize);
  if (!widest || !currentSize) return;

  // Text width scales linearly with font size, so this ratio is a property
  // of the copy and the typeface alone — the same number whatever size is
  // currently applied. That is what keeps re-running this from chasing its
  // own output: the measurement cannot drift as the size it sets changes.
  const widthPerPx = widest / currentSize;

  // Fit the block's *corners* to the circle, not its width, and fit them
  // where the block actually sits rather than at the centre. Centring on the
  // visible sun moves the block up by `bias`, and a circle is narrower the
  // further you get from its middle, so the corners that bind are the top
  // pair, at bias + half the block's height. With line-height: 1 a block of
  // n lines is n * size tall, so for half-width a = widthPerPx / 2 and
  // half-height b = n / 2:
  //
  //   (a * size)^2 + (bias + b * size)^2 <= r^2
  //
  // which is a quadratic in size with one positive root. At bias 0 it
  // reduces to 2r / hypot(widthPerPx, n) — the centred case. Fitting width
  // alone is what let earlier versions overhang the curve.
  const fitRadius = radius * OUTRO_CIRCLE_FIT;
  const bias = Math.min(Math.abs(centreY - visibleCentre), fitRadius);
  const a = widthPerPx / 2;
  const b = lines.length / 2;
  const square = a * a + b * b;
  const fitted =
    (Math.sqrt(bias * bias * b * b + square * (fitRadius * fitRadius - bias * bias)) - bias * b) /
    square;

  // The ceiling is a design value; this only ever comes down from it, so a
  // roomy sun renders the statement exactly as drawn and a tight one shrinks
  // it just enough to stay inside.
  const ceiling =
    Number.parseFloat(getComputedStyle(hero).getPropertyValue("--outro-font-size-max")) ||
    currentSize;
  const size = Math.max(1, Math.min(ceiling, fitted));

  hero.style.setProperty("--outro-font-size", `${size}px`);
  // The chord at the block's furthest edge: the width genuinely available
  // inside the circle at the height the copy occupies.
  const reach = bias + (lines.length * size) / 2;
  const chord = 2 * Math.sqrt(Math.max(0, fitRadius * fitRadius - reach * reach));
  hero.style.setProperty("--sun-fit-width", `${chord}px`);
}

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const zoomWrapRef = useRef<HTMLDivElement>(null);
  const heroContentRef = useRef<HTMLDivElement>(null);
  const sunRef = useRef<HTMLDivElement>(null);
  const outroTextRef = useRef<HTMLHeadingElement>(null);
  const baseImgRef = useRef<HTMLImageElement>(null);
  const outroShownRef = useRef(false);
  const [showOutro, setShowOutro] = useState(false);

  useGSAP(
    () => {
      if (!heroRef.current || !zoomWrapRef.current || !heroContentRef.current || !sunRef.current)
        return;

      const isMobile = window.matchMedia(MOBILE_QUERY).matches;
      const zoomScale = isMobile ? ZOOM_SCALE_MOBILE : ZOOM_SCALE;
      const zoomYPercent = isMobile ? ZOOM_Y_PERCENT_MOBILE : ZOOM_Y_PERCENT;

      const sun = sunRef.current;
      const frame = sun.parentElement?.parentElement;
      if (!frame) return;

      // The entrance started at first paint, well before this effect ran, so
      // its origin has to be derived from an animation's own progress rather
      // than assumed to be now. All three share one clock — they start
      // together and differ only by animation-delay — so any of them will do.
      const content = heroContentRef.current;
      const anyEntrance = content.getAnimations({ subtree: true })[0];
      const entranceOrigin = performance.now() - (Number(anyEntrance?.currentTime) || 0);

      // Declared before the timeline because creating it refreshes the
      // ScrollTrigger synchronously, which fires onRefresh below — same
      // reason resyncEntrance is a module function rather than a closure
      // defined further down.
      const hero = heroRef.current;
      const syncOutro = () => {
        if (!outroTextRef.current) return;
        syncOutroToSun(
          hero,
          sun,
          frame,
          outroTextRef.current,
          baseImgRef.current,
          zoomScale,
          zoomYPercent
        );
      };

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: PIN_END,
          // Paired with Lenis's lerp — see scrollTuning.ts. These two lags
          // stack, so neither is meaningful to tune on its own.
          scrub: heroScrub(),
          pin: true,
          // body is display:flex, which makes ScrollTrigger skip pin-spacing by default
          pinSpacing: true,
          anticipatePin: 1,
          // Makes the sun's function-based from-value re-measure on resize
          // instead of freezing at its first-render measurement.
          invalidateOnRefresh: true,
          // Every refresh swaps the pin-spacer out and back in, restarting
          // the copy's entrance animations — see resyncEntrance.
          onRefresh: () => {
            resyncEntrance(content, entranceOrigin);
            // The sun is sized in vw and positioned in %, so a resize moves
            // its centre and changes what fits inside it. This is the same
            // hook invalidateOnRefresh uses for the tween's own distances,
            // so the statement re-fits on exactly the beats the sun does.
            syncOutro();
          },
          onUpdate: (self) => {
            // SiteNav reads this to hold off hiding until the hero's
            // opening beat is done (see heroProgress.ts).
            heroIntroSettledRef.current = self.progress >= HERO_INTRO_SETTLED_PROGRESS;

            // Reveal the second-section statement as the zoom settles.
            // Guarded by a ref so we only re-render on an actual transition.
            const shouldShow = self.progress >= OUTRO_REVEAL_AT;
            if (shouldShow !== outroShownRef.current) {
              outroShownRef.current = shouldShow;
              setShowOutro(shouldShow);
            }
          },
        },
      });

      // Creating the timeline above installed the pin, which performed the
      // first swap; catch the entrance up before the browser paints it.
      resyncEntrance(content, entranceOrigin);

      // The first measurement above may have run against a fallback face —
      // the display font decides the copy's width, and so the size that fits
      // the circle. Re-fit once the real one is in. Cheap to re-run and it
      // lands long before the statement is scrolled to, so nothing resizes
      // in view.
      let disposed = false;
      document.fonts?.ready.then(() => {
        if (!disposed) syncOutro();
      });

      // Same for the landscape: how much of the sun it covers is read off the
      // image's own natural size, which is 0 until it decodes. Only worth
      // waiting on if it hasn't already — this usually has, since the markup
      // gives it fetchPriority="high" and the preload scanner starts it
      // before the stylesheet parses.
      const baseImg = baseImgRef.current;
      const onArtLoad = () => syncOutro();
      if (baseImg && !baseImg.complete) {
        baseImg.addEventListener("load", onArtLoad, { once: true });
      }

      tl.to(
        heroContentRef.current,
        { opacity: 0, y: -40, ease: "none", duration: 0.25 },
        INTRO_HOLD_DURATION
      )
        .to(
          zoomWrapRef.current,
          { scale: zoomScale, yPercent: zoomYPercent, ease: "none", duration: ZOOM_DURATION },
          ZOOM_STARTS_AT
        )
        // Beat one: the sun holds the horizon while the landscape zooms.
        //
        // It has to move to do that. The sun starts at the untransformed
        // clearance — fully outside the frame, so .heroFrame's overflow:
        // hidden is what conceals it and not the landscape image (see
        // sunClearanceFor for why that distinction matters) — while the zoom
        // running alongside is simultaneously carrying it further down. This
        // travels the difference, so the sun ends the zoom sitting exactly on
        // the frame's bottom edge, ready to rise from a standstill.
        //
        // Linear, and that is load-bearing rather than a default: the zoom's
        // pan it cancels is itself linear, so a linear climb cancels it at
        // every frame instead of only at the endpoints. The sun's on-screen
        // position varies by about a pixel across this entire beat — it is
        // motionless at the horizon as far as anyone can see, and hands over
        // to the rise at an on-screen speed of nothing, which is what beat
        // two's ease wants to start from.
        //
        // Pinning BOTH y and yPercent is load-bearing too, not redundant.
        // .sun carries a resting transform in CSS (so its first paint, before
        // this timeline exists, is already offscreen). GSAP parses that off
        // the computed matrix, which is resolved to *pixels*, and files it
        // under y with yPercent left at 0. Setting only one of the two would
        // stack the CSS offset on top of the tween's and strand the sun low.
        // Both values are functions so invalidateOnRefresh re-measures them
        // after a resize; offsetTop/offsetHeight are layout values and ignore
        // transforms, so they are safe to read whether or not GSAP has
        // already moved the sun.
        .fromTo(
          sun,
          { y: () => sunClearanceFor(sun, frame), yPercent: 0 },
          {
            y: () => sunHorizonFor(sun, frame, zoomScale, zoomYPercent),
            yPercent: 0,
            ease: "none",
            duration: ZOOM_DURATION,
          },
          ZOOM_STARTS_AT
        )
        // Beat two: the rise itself, every pixel of it on screen — from the
        // horizon to the settled centre, arriving at SUN_SETTLE_AT to match
        // OUTRO_REVEAL_AT.
        .to(
          sun,
          {
            y: () =>
              sunSettleFor(
                sun,
                frame,
                baseImgRef.current?.naturalWidth && baseImgRef.current.naturalHeight
                  ? {
                      width: baseImgRef.current.naturalWidth,
                      height: baseImgRef.current.naturalHeight,
                    }
                  : { width: HERO_ART_ASPECT, height: 1 },
                zoomScale,
                zoomYPercent
              ),
            yPercent: 0,
            ease: SUN_RISE_EASE,
            duration: SUN_RISE_DURATION,
          },
          SUN_RISE_STARTS_AT
        )
        // Empty time on the end of the timeline — this is the stillness.
        // A scrubbed timeline is stretched across the whole pin, so its
        // length is whatever its last beat ends at; without this the sun
        // settling at SUN_SETTLE_AT *is* the end of the pin. Tweening a
        // throwaway object is the standard way to hold a timeline open, and
        // keeps the hold visible in one place rather than hidden in the
        // arithmetic. Its length is HOLD_SCROLL_PCT converted through the
        // timeline's own rate, so the stillness is worth exactly that much
        // scrolling.
        .to({}, { duration: HOLD_DURATION });

      return () => {
        disposed = true;
        baseImg?.removeEventListener("load", onArtLoad);
      };
    },
    { scope: heroRef }
  );

  return (
    <main ref={heroRef} className={styles.hero}>
      {/* Every layer of the interaction lives inside this frame, so the zoom,
          the sun and the outro statement are all clipped to the same 32px
          margin and share one coordinate space. */}
      <div className={styles.heroFrame}>
        {/* Sits behind .zoomWrap, not inside it — static for the whole pin
            (no scale/pan, no scroll-driven tween) so it reads as a fixed
            sky backdrop the grassland's transparent areas and the rising
            sun both sit in front of. */}
        <div className={styles.heroSky} />
        <div ref={zoomWrapRef} className={styles.zoomWrap}>
          <div ref={sunRef} className={styles.sun} />
          {/* A real <img>, not a CSS background: the preload scanner finds
              it in the HTML and starts the download before the stylesheet
              has even parsed, which is most of why the landscape used to
              arrive in visible top-to-bottom bands. <picture> also gives a
              PNG fallback that works further back than CSS image-set(). */}
          <picture>
            <source srcSet={HERO_BG_SRCSET} sizes={HERO_BG_SIZES} type="image/webp" />
            <img
              ref={baseImgRef}
              className={styles.heroBaseImg}
              src={HERO_BG_PNG}
              alt=""
              aria-hidden="true"
              fetchPriority="high"
              decoding="async"
            />
          </picture>
        </div>
        <div ref={heroContentRef} className={styles.heroContent}>
          <div className={styles.heroInner}>
            {/* One span per word so the entrance can stagger across the line
                rather than fading the whole heading as a single block — the
                word-by-word focus-in this was modelled on. The spans carry
                their own index because CSS has no sibling counter usable in
                calc(); see .heroWord.

                The separator has to sit BETWEEN the spans, not inside them:
                the words are inline-block, and a trailing space within an
                inline-block is trimmed, which runs the whole heading
                together as "Investlikeatrue...". As a sibling text node it
                renders normally and the heading stays selectable as real
                words. */}
            <h1 className={styles.heroHeading}>
              {HEADING_WORDS.map((word, i) => (
                <Fragment key={word}>
                  <span
                    className={styles.heroWord}
                    style={{ "--word-index": i } as CSSProperties}
                  >
                    {i === 0 ? (
                      <>
                        <span className={styles.dropCap}>{word.slice(0, 1)}</span>
                        {word.slice(1)}
                      </>
                    ) : (
                      word
                    )}
                  </span>
                  {i < HEADING_WORDS.length - 1 ? " " : null}
                </Fragment>
              ))}
            </h1>
            <p className={styles.heroSubtext}>
              Crafted specifically for NRIs to help them grow their wealth in top global
              asset classes.
            </p>
            <Button type="button" className={styles.heroCta}>
              Talk to an Advisor
            </Button>
          </div>
        </div>
        {/* Always mounted, not conditionally rendered — a fade/rise needs the
            element present to transition; showOutro (driven by scroll
            progress in the pinned timeline's onUpdate above) now toggles a
            visibility class on .heroOutroInner instead of the element's own
            presence. aria-hidden keeps it out of the accessibility tree for
            the rest of the pin, matching what conditional mounting used to
            do for free. */}
        <div className={styles.heroOutro} aria-hidden={!showOutro}>
          <div className="grid">
            <div
              className={`${styles.heroOutroInner} ${showOutro ? styles.heroOutroInnerVisible : ""}`}
            >
              <h2 ref={outroTextRef} className={styles.heroOutroText}>
                <span className={styles.heroOutroLine}>
                  <span className={styles.dropCap}>A</span>nchor your roots.
                </span>
                <span className={styles.heroOutroLine}>Expand your reach.</span>
              </h2>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
