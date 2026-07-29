import Image from "next/image";
import { IconBrandX, IconBrandWhatsapp, IconBrandFacebook } from "@tabler/icons-react";

import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.section}>
      <div className="grid">
        <div className={styles.top}>
          <p className={styles.tagline}>
            A modern investing experience built for NRIs who want a clean, credible
            path into Indian mutual funds &amp; US stocks without getting buried in
            paperwork, confusion, or bad advice.
          </p>
          <Image
            src="/images/desh-logo-white.png"
            alt="Desh"
            width={166}
            height={74}
            className={styles.logo}
          />
        </div>

        <hr className={styles.divider} />

        <div className={styles.bottom}>
          <p className={styles.copyright}>© 2026 Desh | All rights reserved</p>
          <div className={styles.socials}>
            <a href="#" aria-label="Desh on X" className={styles.social}>
              <IconBrandX className={styles.socialIcon} stroke={1.75} />
            </a>
            <a href="#" aria-label="Desh on WhatsApp" className={styles.social}>
              <IconBrandWhatsapp className={styles.socialIcon} stroke={1.75} />
            </a>
            <a href="#" aria-label="Desh on Facebook" className={styles.social}>
              <IconBrandFacebook className={styles.socialIcon} stroke={1.75} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
