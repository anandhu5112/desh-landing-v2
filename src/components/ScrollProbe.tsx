"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { judderExperiment } from "@/lib/judderExperiment";

/**
 * TEMPORARY DIAGNOSTIC — delete before this branch merges.
 *
 * Round two measured the hero frame's screen position on every frame and
 * called the result "pin drift". That is only meaningful WHILE the hero is
 * pinned. Past the pin it scrolls like anything else, so the number quietly
 * became raw scroll speed — and since peaks are held for the session, one
 * swipe to the footer poisoned the reading. Round two's 113px cannot be
 * trusted for the same reason.
 *
 * So the measurement is now gated on the pin actually being active, which is
 * the only window where the claim "this element must not move" is true at
 * all. Everything else is gated with it, so a reading describes the sunrise
 * and nothing else.
 *
 * `blind jump` needs the same care for a different reason: under ?fix=touch
 * Lenis sets the scroll position itself and fires an event for each step, so
 * a large per-event delta there is just a fast flick, not evidence of
 * anything. It stays because it is still the thing that distinguishes the two
 * states — but read it next to drift, never alone.
 *
 * The header states which fix is live, so a screenshot says what it is a
 * screenshot OF.
 *
 * Mounted only for ?probe=1 — see page.tsx.
 */

interface Stats {
  /** Worst movement of the pinned frame between two frames, WHILE PINNED. Should be ~0. */
  drift: number;
  /** Furthest the page travelled between two scroll events, while pinned. */
  blindJump: number;
  /** Worst gap between animation frames, while pinned. */
  rafGap: number;
  /** Lowest one-second frame rate seen while pinned. */
  fps: number;
  /** Frames spent pinned — confirms the window was actually entered. */
  pinnedFrames: number;
  /** Whether the pin is active right now. */
  pinnedNow: boolean;
}

const ZERO: Stats = {
  drift: 0,
  blindJump: 0,
  rafGap: 0,
  fps: 0,
  pinnedFrames: 0,
  pinnedNow: false,
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
    let lastScrollTop = scroller?.scrollTop ?? 0;
    let frameCount = 0;
    let windowStart = performance.now();
    let pinned = false;
    let raf = 0;

    const bump = (key: "drift" | "blindJump" | "rafGap", value: number) => {
      if (value > peaks.current[key]) peaks.current[key] = value;
    };

    const onScroll = () => {
      const top = scroller?.scrollTop ?? 0;
      if (pinned) bump("blindJump", Math.round(Math.abs(top - lastScrollTop)));
      lastScrollTop = top;
    };
    scroller?.addEventListener("scroll", onScroll, { passive: true });

    // Looked up per frame rather than captured once: Hero builds its
    // ScrollTrigger in its own layout effect, which may not have run when
    // this one does, and a stale null would silently disable the whole probe.
    const pinTrigger = () => ScrollTrigger.getAll().find((st) => st.pin);

    const tick = () => {
      const now = performance.now();
      const wasPinned = pinned;
      pinned = pinTrigger()?.isActive ?? false;

      if (pinned) {
        peaks.current.pinnedFrames++;
        // Skip the entry frame: the transition into the pin legitimately
        // moves the element, and that is not drift.
        if (wasPinned) {
          bump("rafGap", Math.round(now - lastFrameAt));
          if (frame) {
            const top = frame.getBoundingClientRect().top;
            if (lastFrameTop !== null) bump("drift", Math.round(Math.abs(top - lastFrameTop)));
            lastFrameTop = top;
          }
        } else if (frame) {
          lastFrameTop = frame.getBoundingClientRect().top;
        }

        frameCount++;
        if (now - windowStart >= 1000) {
          const fps = Math.round((frameCount * 1000) / (now - windowStart));
          if (peaks.current.fps === 0 || fps < peaks.current.fps) peaks.current.fps = fps;
          frameCount = 0;
          windowStart = now;
        }
      } else {
        // Reset the sampling window so time spent outside the pin never lands
        // in an fps figure that claims to describe the sunrise.
        frameCount = 0;
        windowStart = now;
        lastFrameTop = null;
      }

      lastFrameAt = now;
      peaks.current.pinnedNow = pinned;
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

  const row = (label: string, value: number | string, bad: boolean) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ opacity: 0.7 }}>{label}</span>
      <span style={{ fontWeight: 700, color: bad ? "#ff8a8a" : "#8affa0" }}>{value}</span>
    </div>
  );

  return (
    <div
      style={{
        position: "fixed",
        left: 8,
        bottom: 8,
        zIndex: 2147483647,
        background: "rgba(0,0,0,0.86)",
        color: "#fff",
        font: "600 13px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace",
        padding: "10px 12px",
        borderRadius: 10,
        minWidth: 228,
        pointerEvents: "none",
      }}
    >
      <div style={{ opacity: 0.6, fontSize: 11, marginBottom: 6 }}>
        PROBE 3 · {judderExperiment().syncTouch ? "fix=touch" : "no fix"} · pinned only
      </div>
      {row("drift", `${stats.drift}px`, stats.drift > 3)}
      {row("blind jump", `${stats.blindJump}px`, stats.blindJump > 40)}
      {row("raf gap", `${stats.rafGap}ms`, stats.rafGap > 40)}
      {row("fps", stats.fps, stats.fps > 0 && stats.fps < 45)}
      {row("pinned frames", stats.pinnedFrames, stats.pinnedFrames < 30)}
      {row("pinned now", stats.pinnedNow ? "yes" : "no", false)}
    </div>
  );
}
