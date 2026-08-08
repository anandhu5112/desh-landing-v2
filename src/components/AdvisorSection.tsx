"use client";

import Image from "next/image";
import Button from "@/components/ui/Button";
import styles from "./AdvisorSection.module.css";

/**
 * "Real Advisors. Real Conversations." — Figma node 362:9113. Sits between
 * UsSection and GrowSection (see ServicesSection.tsx). Copied, not shared:
 * same house rule as every other section.
 */
export default function AdvisorSection() {
  return (
    <section className={styles.section}>
      {/* Full, uncropped source image (2000x1160, ~1.724:1), scaled by
          width alone (height: auto) rather than cover-cropped into a fixed
          box — its own baked-in fade from blue sky to solid white at the
          bottom shows in full this way, and blends directly into
          GrowSection's white background right after it with no separate
          gradient overlay needed to do that job. */}
      <Image
        src="/images/advisor-sky.png"
        alt=""
        width={2000}
        height={1160}
        className={styles.bgImage}
      />
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
