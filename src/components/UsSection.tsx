"use client";

import Image from "next/image";
import Button from "@/components/ui/Button";
import ScrollRevealVideo from "@/components/ScrollRevealVideo";
import styles from "./UsSection.module.css";

/** Mirrors GrowSection's own copy of the same constant — house rule: this
    file duplicates nothing and is duplicated by nothing. */
const AVATARS = [
  "/images/join-avatar-1.png",
  "/images/join-avatar-2.png",
  "/images/join-avatar-3.png",
  "/images/join-avatar-4.png",
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
          <ScrollRevealVideo src="/videos/us-dollar.mp4" className={styles.video} />
        </div>
        <div className={styles.text}>
          <div className={styles.avatarStack}>
            {AVATARS.map((src) => (
              <Image
                key={src}
                src={src}
                alt=""
                width={36}
                height={36}
                className={styles.avatarImg}
              />
            ))}
          </div>
          <h2 className={styles.heading}>Invest beyond borders</h2>
          <p className={styles.subtext}>
            Own shares in the world&apos;s leading companies and build long
            term wealth through global diversification all from one seamless
            platform.
          </p>
          <Button type="button" className={styles.cta}>
            Talk to an Advisor
          </Button>
        </div>
      </div>
    </section>
  );
}
