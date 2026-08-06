/**
 * True once Hero's white-margin frame has finished filling the viewport
 * (see Hero.tsx's FRAME_FILL_DURATION tween), updated on every scrub tick.
 * SiteNav's hide-on-scroll reads this and stays suppressed until it flips
 * true, so the nav stays put while the frame is still filling and only
 * starts fading — together with the hero heading/CTA — once it's done.
 * Same plain-ref pattern as lenisRef: a one-off effect reading a live value,
 * not a component that needs to re-render on change.
 */
export const heroFrameFilledRef: { current: boolean } = { current: false };
