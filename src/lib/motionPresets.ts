import type { Transition } from "motion";

/**
 * The site's one shared motion vocabulary. Any scripted animation (not a
 * simple CSS :hover/:focus transition) should reach for one of these
 * rather than a hand-rolled stiffness/damping/mass triple inline, so
 * unrelated interactions still read as one coherent physical system
 * instead of a grab-bag of tunings.
 *
 * All five are close to critically damped (damping ratio roughly
 * 0.85–1.25 — see the ratio noted on each) rather than tuned for visible
 * bounce: "controlled," not "playful," per this site's own motion brief.
 * They're still deliberately distinct from each other, not one spring
 * reused everywhere — pick the one whose weight matches the interaction,
 * not just whichever is closest at hand.
 *
 * damping ratio ζ = damping / (2 * sqrt(stiffness * mass)); ζ ≈ 1 is
 * critically damped (fastest settle with no overshoot), ζ < 1 underdamped
 * (some overshoot/oscillation), ζ > 1 overdamped (no overshoot, slightly
 * slower approach).
 */
export const springs = {
  /** Press/tap feedback that has to read as instantaneous. Very high
   *  stiffness, low mass, ζ ≈ 1.07 (just overdamped) — snaps in with no
   *  rebound. */
  snappy: { type: "spring", stiffness: 700, damping: 40, mass: 0.5 } satisfies Transition,

  /** The default for most transitions — crossfades, value changes that
   *  aren't a big entrance or a tiny tap. ζ ≈ 0.91: a hair of give, not a
   *  visible bounce. */
  smooth: { type: "spring", stiffness: 300, damping: 30, mass: 0.9 } satisfies Transition,

  /** Slower and weightier — big structural moves (a container resizing).
   *  ζ ≈ 0.85: a touch more give, reads as deliberate rather than twitchy
   *  at this scale. */
  gentle: { type: "spring", stiffness: 140, damping: 22, mass: 1.2 } satisfies Transition,

  /** Click/press micro-interactions that need to feel *stronger* than
   *  "snappy" — the split second a press has to register as immediate.
   *  ζ ≈ 1.26, fully overdamped: crisp, no rebound at all. */
  interaction: { type: "spring", stiffness: 800, damping: 45, mass: 0.4 } satisfies Transition,

  /** Elements arriving on screen — some physical presence (higher mass)
   *  but still settles quickly, ζ ≈ 0.94. */
  entrance: { type: "spring", stiffness: 220, damping: 28, mass: 1 } satisfies Transition,
} as const;

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
