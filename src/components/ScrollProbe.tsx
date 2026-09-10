"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * TEMPORARY DIAGNOSTIC — delete before this branch merges.
 *
 * Round one established what the judder is NOT. On an iPhone, mid-sunrise:
 * fps 57, worst frame gap 65ms — the device is keeping up, so this was never
 * a paint-cost or a starved-ticker problem. What it did catch was `pin drift`
 * at 45px: the pinned hero frame, which by definition should sit at exactly
 * the same screen position on every frame, moved 45px between two
 * consecutive ones.
 *
 * Two things can throw a pinned frame that far while the renderer is healthy,
 * and they want different fixes:
 *
 *   1. The browser's own toolbar collapsing. The page lives in a `position:
 *      fixed; inset: 0` box, so the scroller's height follows the layout
 *      viewport — when the address bar slides away the whole scroll geometry
 *      changes underneath a pin whose start/end were measured against the old
 *      height. SmoothScroll also fires a debounced ScrollTrigger.refresh() on
 *      every resize, which re-measures and can move things again.
 *
 *   2. Scroll events arriving in lumps. The pin is held still by a transform
 *      that JS rewrites per scroll event, so if the compositor scrolls while
 *      JS hears nothing, the frame slides and then snaps back.
 *
 * `vh delta` + `refreshes` catch the first. `blind jump` catches the second:
 * the largest distance the scroller travelled BETWEEN two consecutive scroll
 * events, which is exactly how far the page moved while JS was blind.
 *
 * Round one's `scroll gap` is gone. It could not tell a real stall from the
 * reader simply pausing between swipes, and 965ms against a 1000ms arming
 * window is much more likely to have been the pause.
 *
 * Mounted only for ?probe=1 — see page.tsx.
 */

/**
 * Peaks record only while the page is being scrolled, and are then held for
 * the rest of the session — reload to reset. Holding is what lets someone
 * swipe through the whole sunrise and read the worst moment afterwards;
 * arming on scroll is what keeps a cold load's long tasks out of the reading.
 */
const ARMED_AFTER_SCROLL_MS = 1000;

interface Stats {
  /** Worst gap between consecutive animation frames. */
  rafGap: number;
  /** Lowest one-second frame rate seen while scrolling. */
  fps: number;
  /** Worst single-frame movement of the pinned frame. Should be ~0. */
  pinDrift: number;
  /** Largest change in the scroller's own height — i.e. the browser toolbar. */
  vhDelta: number;
  /** How many times that height changed at all. */
  vhChanges: number;
  /** ScrollTrigger.refresh() calls during scrolling. Each one re-measures the pin. */
  refreshes: number;
  /** Furthest the page travelled between two consecutive scroll events. */
  blindJump: number;
}

const ZERO: Stats = {
  rafGap: 0,
  fps: 0,
  pinDrift: 0,
  vhDelta: 0,
  vhChanges: 0,
  refreshes: 0,
  blindJump: 0,
};

export default function ScrollProbe() {
  const [on, setOn] = useState(false);
  const [stats, setStats] = useState<Stats>(ZERO);
  const peaks = useRef<Stats>({ ...ZERO });

  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("probe")) return;
    setOn(true);

    const scroller = document.getElementById("page-scroller");
    const frame = document.querySelector<HTMLElement>('[class*="heroFrame"]');

    let lastFrameAt = performance.now();
    let lastFrameTop: number | null = null;
    let lastHeight = scroller?.clientHeight ?? 0;
    let lastScrollTop = scroller?.scrollTop ?? 0;
    let frameCount = 0;
    let windowStart = performance.now();
    let armedUntil = 0;
    let raf = 0;

    const bump = (key: keyof Stats, value: number) => {
      if (value > peaks.current[key]) peaks.current[key] = value;
    };

    const onScroll = () => {
      const now = performance.now();
      const top = scroller?.scrollTop ?? 0;
      // How far the page moved since JS last heard about it. Under a healthy
      // event stream this is a handful of px; a large value means the
      // compositor ran on without the pin's transform being told.
      if (now < armedUntil) bump("blindJump", Math.round(Math.abs(top - lastScrollTop)));
      lastScrollTop = top;
      armedUntil = now + ARMED_AFTER_SCROLL_MS;
    };
    scroller?.addEventListener("scroll", onScroll, { passive: true });

    // Counted from ScrollTrigger itself rather than from the resize listener,
    // so this reflects refreshes from every source — SmoothScroll's debounced
    // one and GSAP's own autoRefreshEvents alike.
    const onRefresh = () => {
      if (performance.now() < armedUntil) peaks.current.refreshes++;
    };
    ScrollTrigger.addEventListener("refresh", onRefresh);

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

      // The scroller's own box, not window.innerHeight: it is what the pin's
      // start/end were measured against, and it is what a collapsing toolbar
      // actually changes here.
      const height = scroller?.clientHeight ?? 0;
      if (height !== lastHeight) {
        if (armed) {
          bump("vhDelta", Math.abs(height - lastHeight));
          peaks.current.vhChanges++;
        }
        lastHeight = height;
      }

      if (frame) {
        const top = frame.getBoundingClientRect().top;
        if (armed && lastFrameTop !== null) {
          bump("pinDrift", Math.round(Math.abs(top - lastFrameTop)));
        }
        lastFrameTop = top;
      }

      setStats({ ...peaks.current });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      scroller?.removeEventListener("scroll", onScroll);
      ScrollTrigger.removeEventListener("refresh", onRefresh);
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
        minWidth: 216,
        pointerEvents: "none",
      }}
    >
      <div style={{ opacity: 0.55, fontSize: 11, marginBottom: 6 }}>
        PROBE 2 · reload to reset
      </div>
      {row("pin drift", stats.pinDrift, "px", stats.pinDrift > 3)}
      {row("vh delta", stats.vhDelta, "px", stats.vhDelta > 0)}
      {row("vh changes", stats.vhChanges, "", stats.vhChanges > 0)}
      {row("refreshes", stats.refreshes, "", stats.refreshes > 0)}
      {row("blind jump", stats.blindJump, "px", stats.blindJump > 40)}
      {row("raf gap", stats.rafGap, "ms", stats.rafGap > 40)}
      {row("fps", stats.fps, "", stats.fps < 45)}
    </div>
  );
}
