"use client";

import Image from "next/image";
import Button from "@/components/ui/Button";
import ScrollRevealVideo from "@/components/ScrollRevealVideo";
import { TextRotate } from "@/components/ui/text-rotate";
import { useInView } from "@/hooks/useInView";
import styles from "./GrowSection.module.css";

/** Figma node 317:7182 — four fund-partner badges, each its own bordered/
    shadowed tile rendered from its real exported asset, not the single
    flattened 194x73 raster this replaces (which pixelated badly once
    scaled past its native size — these are 512x512/250x250 source, crisp
    at any reasonable badge size). Replaces the generic avatar stack
    UsSection still uses; this section's own assets, not shared with it. */
const BADGES = [
  "/images/india-badge-1.png",
  "/images/india-badge-2.png",
  "/images/india-badge-3.png",
  "/images/india-badge-4.png",
];

/**
 * India content — first half of ServicesSection's combined India+US block
 * (Figma node 288:6214's first block). Text left, media right. Copied, not
 * shared with UsSection: same house rule as every other section. No scroll-
 * snap of its own — ServicesSection owns one shared snap/rise for the pair
 * so the two read as a single continuous block, not two separate stops.
 */
export default function GrowSection() {
  // Observes .text, not the heading itself — see the identical comment on
  // every other section's heading trigger for why a zero-area heading can't
  // be the observed element.
  const [textColRef, headingInView] = useInView<HTMLDivElement>();

  return (
    <section className={styles.section}>
      <div className={`grid ${styles.panel}`}>
        <div ref={textColRef} className={styles.text}>
          <div className={styles.badgeStack}>
            {BADGES.map((src) => (
              <Image
                key={src}
                src={src}
                alt=""
                width={72}
                height={72}
                className={styles.badge}
              />
            ))}
            <span className={`${styles.badge} ${styles.badgePlus}`}>
              <Image
                src="/images/india-badge-plus.svg"
                alt=""
                width={17}
                height={17}
                className={styles.badgePlusIcon}
              />
            </span>
          </div>
          <h2 className={styles.heading}>
            <TextRotate
              texts={["Grow your"]}
              splitBy="words"
              auto={false}
              loop={false}
              trigger={headingInView}
            />{" "}
            <TextRotate
              texts={["wealth in India."]}
              splitBy="words"
              auto={false}
              loop={false}
              trigger={headingInView}
            />
          </h2>
          <p className={styles.subtext}>
            Access professionally managed mutual funds that help NRIs
            participate in India&apos;s long term growth with confidence and
            convenience.
          </p>
          <Button type="button" className={styles.cta}>
            Talk to an Advisor
          </Button>
        </div>
        <div className={styles.media}>
          <ScrollRevealVideo src="/videos/indian-ruppee.mp4" className={styles.video} />
        </div>
      </div>
    </section>
  );
}
