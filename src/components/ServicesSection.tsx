"use client";

import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import GrowSection from "./GrowSection";
import MarqueeDivider from "./MarqueeDivider";
import UsSection from "./UsSection";
import { useSnapIntoView } from "@/hooks/useSnapIntoView";
import styles from "./ServicesSection.module.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger);
}

/** Extra upward travel the block covers on top of normal scroll, in px. */
const RISE_DISTANCE = 120;

/**
 * Wraps GrowSection + UsSection as one continuous block (both keep their
 * own content/layout — this only owns how the pair behaves as a whole):
 *
 * - One scroll-snap stop for the pair, not one per section — see
 *   useSnapIntoView on .snapWrap. Scrolling from India into US no longer
 *   pauses at a section boundary; it reads as a single section.
 * - A lightweight parallax rise as the block scrolls into view from below
 *   Hero, so it feels like it's moving up towards the sun rather than just
 *   appearing in place. Not pinned — the page keeps scrolling normally
 *   underneath; this only nudges .riseWrap's own position within that
 *   scroll via a plain (unpinned) scrub ScrollTrigger, so it can't affect
 *   Hero's own pinned timeline or any other section's layout.
 */
export default function ServicesSection() {
  const snapRef = useSnapIntoView<HTMLDivElement>();
  const riseRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!riseRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.fromTo(
      riseRef.current,
      { y: RISE_DISTANCE },
      {
        y: 0,
        ease: "none",
        scrollTrigger: {
          trigger: riseRef.current,
          start: "top bottom",
          end: "top center",
          scrub: true,
        },
      }
    );
  }, []);

  return (
    <div ref={snapRef} className={styles.snapWrap}>
      <div ref={riseRef} className={styles.riseWrap}>
        <GrowSection />
        <MarqueeDivider />
        <UsSection />
      </div>
    </div>
  );
}
