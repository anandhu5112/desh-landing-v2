"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import styles from "./MarqueeDivider.module.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP);
}

/** Figma node 321:7226 — same three phrases, same order, cycled forever. */
const PHRASES = [
  "Expertly curated fund selection",
  "SIPs and lump sum investing",
  "Personalized support for NRIs",
];

/** Matches .track's own `gap` in MarqueeDivider.module.css — the wrap math
    below needs one group's full cycle width (its own width plus the gap
    before the next copy starts), and CSS `gap` isn't readable off a
    getBoundingClientRect() call, so this is kept in sync by hand. */
const TRACK_GAP = 19;

/** How many px the track moves per px of scroll. 1 = direct 1:1 mapping,
    not a stylised multiple — scroll 300px, the banner travels 300px. */
const SPEED = 1;

/** Repeated enough times that .group0's cycle width times (GROUP_COUNT - 1)
    comfortably exceeds any realistic viewport — see the wrap math below for
    why that headroom is what keeps the strip gapless at either edge. */
const GROUP_COUNT = 8;

/**
 * Scroll-linked infinite marquee — the divider between GrowSection and
 * UsSection (see ServicesSection.tsx). Not a time-based/autoplaying
 * marquee: position is driven entirely by accumulated scroll delta, so it
 * only moves while the page does, right on scroll-down and left on
 * scroll-up, and sits still the instant scrolling stops.
 *
 * Reads window.scrollY directly off GSAP's own ticker rather than
 * Lenis's scroll event — Lenis drives the real scroll position each frame
 * (see SmoothScroll.tsx), so window.scrollY is already the smoothed value
 * with or without Lenis present (e.g. under prefers-reduced-motion, where
 * SmoothScroll never instantiates one), with no separate wiring needed.
 */
export default function MarqueeDivider() {
  const trackRef = useRef<HTMLDivElement>(null);
  const group0Ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const track = trackRef.current;
    const group0 = group0Ref.current;
    if (!track || !group0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let lastScrollY = window.scrollY;
    // Unbounded running total of scroll delta — wrapped into a bounded,
    // tile-safe range only at the point of applying it (see tick below),
    // so direction reverses cleanly at any accumulated distance.
    let acc = 0;

    const tick = () => {
      const scrollY = window.scrollY;
      acc += (scrollY - lastScrollY) * SPEED;
      lastScrollY = scrollY;

      const cycleWidth = group0.getBoundingClientRect().width + TRACK_GAP;
      if (cycleWidth <= 0) return;

      // wrapped is always in [0, cycleWidth) regardless of acc's sign —
      // JS's % can return negative for negative acc, so it's forced
      // positive first. translateX then sits in [-cycleWidth, 0): shifting
      // it up towards 0 (as acc grows on scroll-down) slides the track
      // right, revealing more of .group0 from the left edge; shifting it
      // down towards -cycleWidth (acc shrinking on scroll-up) slides it
      // left. With GROUP_COUNT copies laid end to end, that bounded window
      // never runs out of tiled content to show on either side.
      const wrapped = ((acc % cycleWidth) + cycleWidth) % cycleWidth;
      gsap.set(track, { x: wrapped - cycleWidth });
    };

    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <div className={styles.banner} aria-hidden="true">
      <div ref={trackRef} className={styles.track}>
        {Array.from({ length: GROUP_COUNT }, (_, i) => (
          <div
            key={i}
            ref={i === 0 ? group0Ref : undefined}
            className={styles.group}
          >
            {PHRASES.map((phrase) => (
              // Dot trails every phrase, including the last — that trailing
              // dot is what makes the seam between this group and the next
              // read as the same uniform rhythm as every other gap.
              <span key={phrase} className={styles.pair}>
                <span className={styles.text}>{phrase}</span>
                <span className={styles.dot} />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
