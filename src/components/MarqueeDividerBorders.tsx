"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import styles from "./MarqueeDividerBorders.module.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP);
}

/** Sits after UsSection ("Invest Beyond Borders"), so its own set of
    phrases — not MarqueeDivider's India-facing three. */
const PHRASES = [
  "Fractional investing available",
  "Diversify beyond Indian markets",
  "Invest with confidence from anywhere",
];

/** Matches .track's own `gap` in MarqueeDividerBorders.module.css — see
    MarqueeDivider.tsx's identical comment for why this can't just be read
    off a getBoundingClientRect() call. */
const TRACK_GAP = 19;

/** How many px the track moves per px of scroll. 1 = direct 1:1 mapping,
    not a stylised multiple — scroll 300px, the banner travels 300px. */
const SPEED = 1;

/** Repeated enough times that .group0's cycle width times (GROUP_COUNT - 1)
    comfortably exceeds any realistic viewport — see the wrap math below for
    why that headroom is what keeps the strip gapless at either edge. */
const GROUP_COUNT = 8;

/**
 * Scroll-linked infinite marquee — same mechanic as MarqueeDivider (see its
 * own doc comment for the full explanation of the wrap math and why this
 * reads window.scrollY off GSAP's ticker rather than a Lenis event). Copied
 * rather than shared/parameterised: this one sits at a different page
 * boundary (right before BloomSection, not between GrowSection/UsSection),
 * carries its own content, and has no scroll-snap of its own — same "one
 * file, no shared dependents" house rule as every other section.
 */
export default function MarqueeDividerBorders() {
  const trackRef = useRef<HTMLDivElement>(null);
  const group0Ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const track = trackRef.current;
    const group0 = group0Ref.current;
    if (!track || !group0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let lastScrollY = window.scrollY;
    let acc = 0;

    const tick = () => {
      const scrollY = window.scrollY;
      acc += (scrollY - lastScrollY) * SPEED;
      lastScrollY = scrollY;

      const cycleWidth = group0.getBoundingClientRect().width + TRACK_GAP;
      if (cycleWidth <= 0) return;

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
