"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { lenisRef } from "@/lib/lenis";

/**
 * Renders nothing — purely wires Lenis's smoothed scroll into GSAP's ticker
 * so Hero's pinned ScrollTrigger timeline stays in sync. Kept out of
 * Hero.tsx entirely; Hero has no reason to know Lenis exists.
 */
/** Debounce so a drag-resize (or DevTools' device toolbar switching
    dimensions) doesn't fire a refresh per intermediate frame — only once
    the size has actually settled. */
const RESIZE_REFRESH_DELAY = 150;

export default function SmoothScroll() {
  useEffect(() => {
    // Keeps Hero's pinned ScrollTrigger (see Hero.tsx) in sync with the
    // real viewport after mount. GSAP's own default autoRefreshEvents
    // already includes "resize", but that alone wasn't enough to catch
    // every case that changes window.innerWidth post-mount without a true
    // browser resize (DevTools' device toolbar, some Android keyboard/
    // address-bar transitions) — the pinned element's pin-spacer kept the
    // width it was measured at, not the current one, leaving a gap down
    // one side. Runs unconditionally, before the reduced-motion branch
    // below, since the pin itself exists either way — only Lenis and its
    // ticker wiring are skipped under reduced motion, not the pin.
    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => ScrollTrigger.refresh(), RESIZE_REFRESH_DELAY);
    };
    window.addEventListener("resize", onResize);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return () => {
        clearTimeout(resizeTimer);
        window.removeEventListener("resize", onResize);
      };
    }

    const lenis = new Lenis({ anchors: true });
    lenis.on("scroll", ScrollTrigger.update);
    lenisRef.current = lenis;

    // Driven off GSAP's own ticker rather than Lenis's `autoRaf`, so there is
    // exactly one frame loop driving both the scrub interpolation and the
    // scroll interpolation — not two independent rAF loops drifting apart.
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    ScrollTrigger.refresh();

    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      gsap.ticker.remove(raf);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return null;
}
