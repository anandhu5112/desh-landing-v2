"use client";

import ScrollRevealVideo from "@/components/ScrollRevealVideo";
import LogoCarousel from "@/components/LogoCarousel";
import styles from "./UsSection.module.css";

/** "Trusted by" company marks, not NRI investor avatars — this row reads as
    the platforms/employers members invest through, not as a face stack. */
const COMPANY_LOGOS = [
  "/images/logos/apple.svg",
  "/images/logos/accenture.svg",
  "/images/logos/amazon.svg",
  "/images/logos/fedex.svg",
  "/images/logos/google.svg",
  "/images/logos/meta.svg",
  "/images/logos/microsoft.svg",
  "/images/logos/walmart.svg",
];

/**
 * US content — second half of ServicesSection's combined India+US block
 * (Figma node 288:6214's second block). Media left, text right — the flip
 * is deliberate, matching Figma's own layout for this block. No scroll-snap
 * of its own — see GrowSection's identical comment.
 */
export default function UsSection() {
  return (
    <section className={styles.section}>
      <div className={`grid ${styles.panel}`}>
        <div className={styles.media}>
          <ScrollRevealVideo
            src="/videos/us-dollar-720.mp4"
            poster="/images/us-dollar-poster.webp"
            className={styles.video}
          />
        </div>
        <div className={styles.text}>
          <LogoCarousel logos={COMPANY_LOGOS} className={styles.avatarStack} />
          <h2 className={styles.heading}>
            <span className={styles.dropCap}>H</span>edge against the depreciating rupee
          </h2>
          <p className={styles.subtext}>
            Own a slice of the world’s biggest companies through USD funds
            regulated in GIFT City. No US brokerage account, no US tax filing.
          </p>
        </div>
      </div>
    </section>
  );
}
