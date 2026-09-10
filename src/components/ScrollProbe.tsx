"use client";

import { useEffect, useRef, useState } from "react";

/**
 * TEMPORARY DIAGNOSTIC — delete before this branch merges.
 *
 * The hero's sunrise judders on iPhone but not on desktop, and there are two
 * candidate causes that look identical to the eye and cannot be told apart by
 * reasoning:
 *
 *   1. requestAnimationFrame is throttled or stalled while iOS runs a native
 *      momentum scroll. GSAP's ticker rides rAF, so the whole scrubbed
 *      timeline would freeze and then jump.
 *
 *   2. rAF is fine, but the scroll EVENTS that feed ScrollTrigger arrive
 *      coalesced. The hero is pinned with pinType "transform" (the default
 *      for a custom scroller), which means a JS-written translate is what
 *      holds the frame still — so the frame can only be as steady as the
 *      scroll position JS last heard about.
 *
 * They call for opposite fixes, so this measures which one is happening.
 * Everything is peak-held, because the interesting moment is over before
 * anyone can read a live number.
 *
 * Mounted only for ?probe=1 — see page.tsx.
 */

/**
 * Peaks are only recorded while the page is actually being scrolled, and are
 * then held for the rest of the session — reload to reset.
 *
 * Both halves matter. Holding forever is what lets someone swipe through the
 * whole sunrise and read the worst moment afterwards, instead of having to
 * photograph a number that is already gone. Gating on scroll is what keeps
 * the load itself out of the reading: the first seconds of a cold page are
 * full of long tasks, and a frame gap from decoding the hero artwork would
 * otherwise be indistinguishable from one caused by the scroll.
 */
const ARMED_AFTER_SCROLL_MS = 1000;

interface Stats {
  /** Worst gap between consecutive animation frames. >32ms means dropped frames. */
  rafGap: number;
  /** Worst gap between consecutive scroll events. */
  scrollGap: number;
  /** Worst single-frame jump of the pinned frame's top edge. Should be ~0. */
  pinDrift: number;
  /** Worst single-frame jump of the sun. Smooth motion is a few px. */
  sunStep: number;
  /** Lowest one-second frame rate seen while scrolling. */
  fps: number;
  /** Scroll events seen at all — confirms the probe is recording. */
  scrolls: number;
}

const ZERO: Stats = { rafGap: 0, scrollGap: 0, pinDrift: 0, sunStep: 0, fps: 0, scrolls: 0 };

export default function ScrollProbe() {
  const [on, setOn] = useState(false);
  const [stats, setStats] = useState<Stats>(ZERO);
  const peaks = useRef<Stats>({ ...ZERO });

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("probe")) return;
    setOn(true);

    const scroller = document.getElementById("page-scroller");
    const frame = document.querySelector<HTMLElement>('[class*="heroFrame"]');
    const sun = document.querySelector<HTMLElement>('[class*="__sun"]');

    let lastFrameAt = performance.now();
    let lastScrollAt = performance.now();
    let lastFrameTop: number | null = null;
    let lastSunTop: number | null = null;
    let frameCount = 0;
    let windowStart = performance.now();
    let armedUntil = 0;
    let scrolls = 0;
    let raf = 0;

    // Deliberately its OWN rAF loop rather than a GSAP ticker callback: if
    // GSAP's ticker is the thing being starved, a probe living inside it
    // would be starved in exactly the same way and would report nothing.
    const bump = (key: keyof Stats, value: number) => {
      if (value > peaks.current[key]) peaks.current[key] = value;
    };

    const onScroll = () => {
      const now = performance.now();
      // Only measure gaps BETWEEN scrolls of one gesture. The idle stretch
      // before the first touch is not a gap, it is the page sitting still.
      if (now < armedUntil) bump("scrollGap", Math.round(now - lastScrollAt));
      lastScrollAt = now;
      armedUntil = now + ARMED_AFTER_SCROLL_MS;
      scrolls++;
    };
    scroller?.addEventListener("scroll", onScroll, { passive: true });

    const tick = () => {
      const now = performance.now();
      const armed = now < armedUntil;
      if (armed) bump("rafGap", Math.round(now - lastFrameAt));
      lastFrameAt = now;

      frameCount++;
      if (now - windowStart >= 1000) {
        const fps = Math.round((frameCount * 1000) / (now - windowStart));
        // fps is the one stat where the WORST reading is the low one.
        if (armed && (peaks.current.fps === 0 || fps < peaks.current.fps)) {
          peaks.current.fps = fps;
        }
        frameCount = 0;
        windowStart = now;
      }

      // Both read in screen coordinates, which is the whole point: what the
      // eye judges is where these land in the viewport, not what the timeline
      // thinks their progress is.
      if (frame) {
        const top = frame.getBoundingClientRect().top;
        if (armed && lastFrameTop !== null) bump("pinDrift", Math.round(Math.abs(top - lastFrameTop)));
        lastFrameTop = top;
      }
      if (sun) {
        const top = sun.getBoundingClientRect().top;
        if (armed && lastSunTop !== null) bump("sunStep", Math.round(Math.abs(top - lastSunTop)));
        lastSunTop = top;
      }

      peaks.current.scrolls = scrolls;
      setStats({ ...peaks.current });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      scroller?.removeEventListener("scroll", onScroll);
    };
  }, []);

  if (!on) return null;

  const row = (label: string, value: number, unit: string, bad: boolean) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ opacity: 0.7 }}>{label}</span>
      <span style={{ fontWeight: 700, color: bad ? "#ff8a8a" : "#8affa0" }}>
        {value}
        {unit}
      </span>
    </div>
  );

  return (
    <div
      style={{
        position: "fixed",
        left: 8,
        bottom: 8,
        zIndex: 2147483647,
        background: "rgba(0,0,0,0.82)",
        color: "#fff",
        font: "600 13px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace",
        padding: "10px 12px",
        borderRadius: 10,
        minWidth: 208,
        pointerEvents: "none",
        WebkitBackdropFilter: "none",
      }}
    >
      <div style={{ opacity: 0.55, fontSize: 11, marginBottom: 6 }}>
        SCROLL PROBE · reload to reset
      </div>
      {row("raf gap", stats.rafGap, "ms", stats.rafGap > 40)}
      {row("scroll gap", stats.scrollGap, "ms", stats.scrollGap > 40)}
      {row("pin drift", stats.pinDrift, "px", stats.pinDrift > 3)}
      {row("sun step", stats.sunStep, "px", stats.sunStep > 24)}
      {row("fps", stats.fps, "", stats.fps < 45)}
      {row("scrolls", stats.scrolls, "", false)}
    </div>
  );
}
