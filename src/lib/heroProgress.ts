/**
 * True once Hero's opening beat is done (see Hero.tsx's INTRO_HOLD_DURATION),
 * updated on every scrub tick. SiteNav's hide-on-scroll reads this and stays
 * suppressed until it flips true, so the nav stays put through the hero's
 * opening hold and only starts fading — together with the hero heading/CTA —
 * once it's done.
 * Same plain-ref pattern as lenisRef: a one-off effect reading a live value,
 * not a component that needs to re-render on change.
 */
export const heroIntroSettledRef: { current: boolean } = { current: false };
