"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

/**
 * Renders nothing — purely wires Lenis's smoothed scroll into GSAP's ticker
 * so Hero's pinned ScrollTrigger timeline stays in sync. Kept out of
 * Hero.tsx entirely; Hero has no reason to know Lenis exists.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({ anchors: true });
    lenis.on("scroll", ScrollTrigger.update);

    // Driven off GSAP's own ticker rather than Lenis's `autoRaf`, so there is
    // exactly one frame loop driving both the scrub interpolation and the
    // scroll interpolation — not two independent rAF loops drifting apart.
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    ScrollTrigger.refresh();

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);

  return null;
}
