"use client";

import { useEffect, useRef } from "react";
import { lenisRef } from "@/lib/lenis";

/** Fraction of the section's own height that must be visible to trigger the snap. */
const TRIGGER_RATIO = 0.3;
/** Ratio must fall back below this before the next crossing can re-trigger —
    otherwise a crossing that hovers right at TRIGGER_RATIO would refire. */
const REARM_RATIO = 0.05;
const SNAP_DURATION = 1.1;

/**
 * Attach to a full-bleed section: once ~30% of it has scrolled into view —
 * entering from above or below — finishes the job by smooth-scrolling the
 * rest of the way so it fills the viewport, rather than leaving it half
 * revealed. Re-arms once the section mostly leaves view, so scrolling back
 * up into it snaps again too.
 *
 * Lenis-aware (falls back to native smooth scrollIntoView without it, e.g.
 * under prefers-reduced-motion, where SmoothScroll never instantiates one)
 * so the snap rides the same interpolated scroll as everything else instead
 * of fighting it with an independent native scroll.
 */
export function useSnapIntoView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let armed = true;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio < REARM_RATIO) {
          armed = true;
          return;
        }
        if (!armed || !entry.isIntersecting || entry.intersectionRatio < TRIGGER_RATIO) {
          return;
        }
        armed = false;

        const lenis = lenisRef.current;
        if (lenis) {
          lenis.scrollTo(el, { duration: SNAP_DURATION });
        } else {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      },
      { threshold: [0, REARM_RATIO, TRIGGER_RATIO, 1] },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}
