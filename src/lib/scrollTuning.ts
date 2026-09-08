/**
 * How responsive the hero's scroll sequence feels — both halves of it, in
 * one place, because they stack and tuning either alone is misleading.
 *
 * Between moving a finger and the sun moving, there are two independent
 * smoothers in series:
 *
 *   1. Lenis eases the scroll POSITION itself            -> LENIS_LERP
 *   2. ScrollTrigger's scrub then eases the ANIMATION's
 *      catch-up to that already-eased position           -> HERO_SCRUB
 *
 * The defaults this replaced were Lenis's own lerp (0.1) plus scrub: 1 —
 * roughly a second of lag layered on top of an already-softened scroll,
 * which is what made the sequence feel heavy and slow to respond next to a
 * natively-pinned page. Reference points that do this well (usecardboard.com,
 * for one) pin with CSS `position: sticky` and have no smoothing layer at
 * all; we can't go that far because our sequence is scrubbed rather than
 * static, but we can stop stacking two lags.
 */

/**
 * Lenis interpolation, 0..1. Higher is snappier; 1 disables smoothing and
 * gives you the browser's native scroll.
 *
 * Deliberately NOT part of the hero-weight tuning below: this one is global,
 * so it also governs every section that is *not* the hero — and those were
 * reported as already feeling right. Changing it to fix the hero would have
 * dragged the rest of the page along with it.
 */
export const LENIS_LERP = 0.15;

/**
 * ScrollTrigger scrub, in seconds of catch-up.
 *
 * History: 1 -> 0.3 to cut the stacked lag, then back up to 0.6 because 0.3
 * let the coarseness of mouse-wheel deltas show through on the sun — scrub
 * was doing double duty, delaying the animation *and* smoothing the input.
 *
 * Now back to 0.3, because the hero was the one part of the page that read
 * as heavy while the rest read as smooth, and this is the only lag the rest
 * of the page doesn't also carry. The earlier steppiness argument is weaker
 * than it looked: Lenis sits in front of this and already advances the
 * scroll position by interpolation on every frame, so what reaches the scrub
 * is a continuous ramp, not raw wheel steps. Whatever chunkiness 0.3 showed
 * before is bounded by LENIS_LERP, not by this number.
 *
 * At 0.6 the sun was still travelling ~600ms after the gesture stopped. If
 * steppiness does reappear on a real mouse wheel, lower LENIS_LERP (smooth
 * the input where the input actually is) rather than raising this back up —
 * raising this puts the lag back.
 */
export const HERO_SCRUB = 0.3;

export function lenisLerp(): number {
  return LENIS_LERP;
}

export function heroScrub(): number {
  return HERO_SCRUB;
}
