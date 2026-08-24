"use client";

import { IconBrandX, IconBrandWhatsapp, IconBrandFacebook } from "@tabler/icons-react";

import { useSnapIntoView } from "@/hooks/useSnapIntoView";
import styles from "./Footer.module.css";

export default function Footer() {
  const sectionRef = useSnapIntoView<HTMLElement>();

  return (
    <footer ref={sectionRef} className={styles.section}>
      {/* The large "Desh" wordmark is part of this artwork, not a separate
          layer — the scene is supplied with it already composited in, and its
          transparent upper third fades into the white page above. */}
      {/* A plain <img>, not next/image: next.config sets images.unoptimized
          (a static export has no optimizer), so next/image would ship the one
          native-width file to every device, and it owns the srcSet prop
          rather than passing it through. Offering the widths directly lets a
          phone pull 208KB instead of 808KB. Widths come from
          `npm run optimize:images`. Below the fold, hence lazy. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- see above:
          next/image cannot serve these variants under output: "export". */}
      <img
        src="/images/footer-scene.webp"
        srcSet={
          "/images/footer-scene-1280.webp 1280w, " +
          "/images/footer-scene-1920.webp 1920w, " +
          "/images/footer-scene.webp 2880w"
        }
        sizes="100vw"
        alt=""
        width={2880}
        height={1598}
        loading="lazy"
        decoding="async"
        className={styles.bgImage}
      />

      <div className={styles.content}>
        <div className={styles.bar}>
          <hr className={styles.divider} />
          {/* Five items on one space-between row — icon, copyright, icon,
              rights, icon — per Figma node 387:17283, rather than text on one
              side and a social cluster on the other. */}
          <div className={styles.bottom}>
            <a href="#" aria-label="Desh on X" className={styles.social}>
              <IconBrandX className={styles.socialIcon} stroke={1.5} />
            </a>
            <p className={styles.meta}>© 2026 Desh</p>
            <a href="#" aria-label="Desh on WhatsApp" className={styles.social}>
              <IconBrandWhatsapp className={styles.socialIcon} stroke={1.5} />
            </a>
            <p className={styles.meta}>All rights reserved</p>
            <a href="#" aria-label="Desh on Facebook" className={styles.social}>
              <IconBrandFacebook className={styles.socialIcon} stroke={1.5} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
