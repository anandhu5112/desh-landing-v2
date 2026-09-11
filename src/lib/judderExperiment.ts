/**
 * TEMPORARY — delete with ScrollProbe once the mobile judder fix is settled.
 *
 * The diagnosis is measured, not guessed: on iPhone the scroller travels up
 * to 113px between two consecutive scroll events, and the pinned hero frame
 * moves by exactly that much. iOS scrolls this nested overflow container on
 * the compositor and syncs the main thread in lumps, so a pin held still by a
 * JS-written transform slides by whatever it was not told about and snaps
 * back when it finally hears. fps is 58 throughout — nothing here is slow.
 *
 * `?fix=touch` hands touch scrolling to Lenis, which then advances the scroll
 * position inside the same rAF that writes the pin's transform. There is no
 * lump to be told about late, because JS owns the position — which is
 * precisely why the desktop, where Lenis already drives the wheel, never had
 * this. The cost is real: native momentum and iOS rubber-banding are replaced
 * by Lenis's own, and every independently scrollable region has to declare
 * itself with data-lenis-prevent (see ContactModal).
 *
 * ScrollTrigger's own `pinType: "fixed"` was the other candidate and is
 * rejected, not untried: on this custom scroller the hero never un-pins.
 * Measured at 1200x800, where the pin ends near y=1490, it stayed
 * `position: fixed` at top 0 at y=1800, 2400 and 4000, where the unmodified
 * build correctly returns it to `relative`. GSAP picks "transform" for custom
 * scrollers for a reason.
 */

export interface JudderExperiment {
  /** Let Lenis drive touch scrolling instead of the compositor. */
  syncTouch: boolean;
}

const OFF: JudderExperiment = { syncTouch: false };

export function judderExperiment(): JudderExperiment {
  if (typeof window === "undefined") return OFF;
  return { syncTouch: new URLSearchParams(window.location.search).get("fix") === "touch" };
}
