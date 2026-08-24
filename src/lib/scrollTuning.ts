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
 */
export const LENIS_LERP = 0.15;

/**
 * ScrollTrigger scrub, in seconds of catch-up.
 *
 * Went 1 -> 0.3 to cut the stacked lag, then back up to 0.6: scrub does
 * double duty, and 0.3 lost too much of the second job. Beyond delaying the
 * animation, it smooths the *input* — mouse wheels deliver scroll in coarse
 * jumps, and the scrub interpolation is what turns those steps into
 * continuous motion. At 0.3 that chunkiness showed through on the sun,
 * which is the largest and slowest thing moving and therefore where any
 * steppiness is most visible. 0.6 keeps most of the responsiveness while
 * putting the smoothing back.
 */
export const HERO_SCRUB = 0.6;

export function lenisLerp(): number {
  return LENIS_LERP;
}

export function heroScrub(): number {
  return HERO_SCRUB;
}
