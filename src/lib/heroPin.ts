/**
 * The hero's "pin" is CSS sticky, not a GSAP transform.
 *
 * Liquid glass forces the page to scroll inside a viewport-sized overflow
 * container (see lib/scroller.ts). iOS compositor-scrolls that overflow and
 * only tells the main thread in lumps — measured at up to 113px between two
 * scroll events, with the JS pin sliding by exactly that much. fps held at
 * 58: nothing was slow, the pin was just late. GreenSock documents this as
 * unfixable for transform pins; `pinType: "fixed"` never unpins on this
 * custom scroller. Sticky is applied on the compositor's own frame, so the
 * hero stays put without JS having to hear about the scroll, and without
 * handing touch scrolling to Lenis (which would replace iOS momentum).
 *
 * GSAP still scrubs the inner timeline (sun, zoom, outro). It does not pin.
 * The containing block has to be the hero's height plus the extra scroll
 * the sequence costs; sticky holds until that parent leaves the scrollport.
 * The extra is the same `+=N%` ScrollTrigger uses — a share of the scroller,
 * not of the hero — so pacing matches the timeline that used to pin.
 */

export function heroPinRangeHeight(
  heroHeight: number,
  scrollerHeight: number,
  extraPct: number
): number {
  if (!(heroHeight > 0)) return 0;
  if (!(scrollerHeight > 0) || !(extraPct >= 0) || !Number.isFinite(extraPct)) {
    return heroHeight;
  }
  return heroHeight + (extraPct / 100) * scrollerHeight;
}
