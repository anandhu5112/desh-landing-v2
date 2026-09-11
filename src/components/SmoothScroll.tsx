"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { lenisRef } from "@/lib/lenis";
import { getScrollContent, getScroller } from "@/lib/scroller";
import { lenisLerp } from "@/lib/scrollTuning";
import { judderExperiment } from "@/lib/judderExperiment";

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

    // The page scrolls inside ScrollRoot's div, not the window, so Lenis
    // has to be pointed at it explicitly — see lib/scroller.ts. Both halves
    // are required: `wrapper` is what actually scrolls, `content` is what
    // Lenis measures to know how far it can.
    const wrapper = getScroller();
    const content = getScrollContent();
    if (!wrapper || !content) {
      return () => {
        clearTimeout(resizeTimer);
        window.removeEventListener("resize", onResize);
      };
    }

    // lerp is set explicitly rather than left at Lenis's default (0.1) —
    // see scrollTuning.ts for why the two smoothing layers are tuned
    // together.
    // syncTouch is TEMPORARY, with lib/judderExperiment.ts.
    const lenis = new Lenis({
      wrapper,
      content,
      anchors: true,
      lerp: lenisLerp(),
      syncTouch: judderExperiment().syncTouch,
    });
    lenis.on("scroll", ScrollTrigger.update);
    lenisRef.current = lenis;

    // Driven off GSAP's own ticker rather than Lenis's `autoRaf`, so there is
    // exactly one frame loop driving both the scrub interpolation and the
    // scroll interpolation — not two independent rAF loops drifting apart.
    // The nav pill (and any other viewport chrome) is fixed *outside* the
    // scroll container, and Lenis ignores a wheel whose event path doesn't
    // include its wrapper — the event reaches window, it just doesn't act on
    // it. Before the page moved inside a scroller this was free, because the
    // wrapper was the window. Without this, putting the cursor over the nav
    // pill and scrolling does nothing at all.
    const onOutsideWheel = (event: WheelEvent) => {
      const target = event.target as Element | null;
      if (!target || wrapper.contains(target)) return;
      // The contact modal scrolls itself and locks the page behind it. The
      // lock is `overflow: hidden` on the wrapper, which stops native
      // scrolling but not a programmatic one — so honour it explicitly here,
      // or a wheel over the backdrop would scroll the page under the modal.
      if (target.closest?.('[role="dialog"], [data-lenis-prevent]')) return;
      if (getComputedStyle(wrapper).overflowY === "hidden") return;
      event.preventDefault();
      lenis.scrollTo(lenis.targetScroll + event.deltaY, { programmatic: false });
    };
    window.addEventListener("wheel", onOutsideWheel, { passive: false });

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    ScrollTrigger.refresh();

    return () => {
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("wheel", onOutsideWheel);
      gsap.ticker.remove(raf);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return null;
}
