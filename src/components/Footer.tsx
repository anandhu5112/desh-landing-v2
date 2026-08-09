"use client";

import Image from "next/image";
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
      <Image
        src="/images/footer-scene.webp"
        alt=""
        width={2880}
        height={1598}
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
