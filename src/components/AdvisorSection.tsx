"use client";

import { Fragment, type CSSProperties } from "react";
import Image from "next/image";
import Button from "@/components/ui/Button";
import { useInView } from "@/hooks/useInView";
import styles from "./AdvisorSection.module.css";

/**
 * "Real Advisors. Real Conversations." — Figma node 390:17305. Sits between
 * UsSection and GrowSection (see ServicesSection.tsx). Copied, not shared:
 * same house rule as every other section.
 *
 * The Figma frame's own avatar-orbit decoration is baked into a flattened
 * raster (no child layers under that node to read positions from), so the
 * rings/avatars below are a live rebuild rather than an extraction —
 * visually equivalent, not pixel-measured.
 */
const AVATAR_SRCS = Array.from(
  { length: 9 },
  (_, i) => `/images/advisor-avatar-${i + 1}.png`,
);

type OrbitDirection = "cw" | "ccw";

type Avatar = { angle: number; src: string };

type Ring = {
  key: string;
  ringClass: string;
  armClass: string;
  direction: OrbitDirection;
  avatars: Avatar[];
};

/** Degrees, 0 = straight up, increasing clockwise, evenly spaced around the
    FULL 360° — not confined to the visible half. Equal spacing is what
    makes the loop read as a continuous, uniform stream rather than a clump
    with gaps: as the ring rotates, avatars cross into and out of the
    visible half at a constant rhythm. Roughly half of each ring's count is
    on screen at any moment; the rest are mid-transit around the hidden
    (off-canvas) side, which is expected, not a bug. */
function evenAngles(count: number, offset: number): number[] {
  return Array.from({ length: count }, (_, i) => offset + i * (360 / count));
}

const RING_ANGLES: Record<string, number[]> = {
  "left-outer": evenAngles(6, 30),
  "left-inner": evenAngles(4, 45),
  "right-outer": evenAngles(6, 30),
  "right-inner": evenAngles(4, 45),
};

const RING_META: Record<string, { ringClass: string; armClass: string; direction: OrbitDirection }> = {
  "left-outer": { ringClass: styles.ringLeftOuter, armClass: styles.armLeftOuter, direction: "cw" },
  "left-inner": { ringClass: styles.ringLeftInner, armClass: styles.armLeftInner, direction: "ccw" },
  "right-outer": { ringClass: styles.ringRightOuter, armClass: styles.armRightOuter, direction: "ccw" },
  "right-inner": { ringClass: styles.ringRightInner, armClass: styles.armRightInner, direction: "cw" },
};

/** Assigns avatar images to every ring's angles up front, in one pass, at
    module load — not a counter mutated while rendering. Cycles through the
    9 available photos (20 chip slots total, so several repeat). */
function buildRings(): Ring[] {
  let cursor = 0;
  return Object.entries(RING_ANGLES).map(([key, angles]) => ({
    key,
    ...RING_META[key],
    avatars: angles.map((angle) => {
      const src = AVATAR_SRCS[cursor % AVATAR_SRCS.length];
      cursor += 1;
      return { angle, src };
    }),
  }));
}

const RINGS: Ring[] = buildRings();

export default function AdvisorSection() {
  // Fires once the section is ~40% on screen — the orbit only starts
  // looping once you've actually scrolled to it, rather than spinning away
  // (unseen) from the moment the page loads.
  const [orbitRef, orbitInView] = useInView<HTMLDivElement>();

  return (
    <section className={styles.section}>
      {/* Full, uncropped source image (2000x1160, ~1.724:1), scaled by
          width alone (height: auto) rather than cover-cropped into a fixed
          box — its own baked-in fade from blue sky to solid white at the
          bottom shows in full this way, and blends directly into
          GrowSection's white background right after it with no separate
          gradient overlay needed to do that job. */}
      <div className={styles.frame}>
        <Image
          src="/images/advisor-sky.png"
          alt=""
          width={2000}
          height={1160}
          className={styles.bgImage}
        />

        {/* Decorative — the avatars carry no information not already in the
            heading/subtext, so the whole layer is hidden from assistive
            tech rather than announced as a list of anonymous photos. */}
        <div
          ref={orbitRef}
          aria-hidden="true"
          className={`${styles.orbitLayer} ${orbitInView ? styles.orbitLayerRunning : ""}`}
        >
          {/* Stroke circle and its avatars are SIBLINGS, not
              parent/child — .orbitArm's percentage left/top positions need
              to resolve against .orbitLayer (the full frame), the same
              containing block .ring itself uses. Nesting arms inside .ring
              would resolve those percentages against the ring's own much
              smaller box instead, putting every avatar hundreds of px off
              in the wrong direction (caught live: chips rendered at
              x=-373px, entirely off-canvas). Fragment groups each ring's
              pieces for React's keys without introducing a positioned
              (or even boxed) parent element. */}
          {RINGS.map((ring) => (
            <Fragment key={ring.key}>
              <div className={`${styles.ring} ${ring.ringClass}`} />
              {ring.avatars.map(({ angle, src }) => {
                const armStyle = {
                  "--start-angle": `${angle}deg`,
                  "--counter-offset": `${-angle}deg`,
                } as CSSProperties;
                const orbitClass = ring.direction === "cw" ? styles.orbitCw : styles.orbitCcw;
                const counterClass =
                  ring.direction === "cw" ? styles.counterCw : styles.counterCcw;

                return (
                  <div
                    key={angle}
                    className={`${styles.orbitArm} ${ring.armClass} ${orbitClass}`}
                    style={armStyle}
                  >
                    <div className={`${styles.chip} ${counterClass}`}>
                      <Image src={src} alt="" width={36} height={36} className={styles.chipImg} />
                    </div>
                  </div>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>
      <div className={styles.content}>
        <h2 className={styles.heading}>
          Real Advisors.
          <br />
          Real Conversations.
        </h2>
        <p className={styles.subtext}>
          Whether you&apos;re starting your investment journey or managing a growing
          portfolio, receive personalized guidance whenever you need it.
        </p>
        <Button type="button" className={styles.cta}>
          Book a Free Consultation
        </Button>
      </div>
    </section>
  );
}
