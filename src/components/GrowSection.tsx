"use client";

import Button from "@/components/ui/Button";
import ScrollRevealVideo from "@/components/ScrollRevealVideo";
import LogoCarousel from "@/components/LogoCarousel";
import styles from "./GrowSection.module.css";

/** Figma node 317:7182's four fund-partner badges — now cycled through
    LogoCarousel's three-card rotation instead of a static overlapping
    row. */
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
  return (
    <section className={styles.section}>
      <div className={`grid ${styles.panel}`}>
        <div className={styles.text}>
          <LogoCarousel logos={BADGES} className={styles.badgeStack} />
          <h2 className={styles.heading}>
            <span className={styles.dropCap}>G</span>row wealth beyond FDs
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
