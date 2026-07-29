"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./SiteNav.module.css";

// Sub-pixel/trackpad noise shouldn't flip direction; only a real scroll counts.
const DIRECTION_THRESHOLD = 4;
// How long scrolling has to be still before the "stopped" reveal kicks in.
const IDLE_REVEAL_MS = 150;

/**
 * Persistent top navigation. Hides on scroll-down, reappears on scroll-up
 * or once scrolling stops — both are driven off native window scroll, which
 * is what GSAP's ScrollTrigger scrub reads too, so nothing here needs to
 * coordinate with the pinned Hero timeline.
 */
export default function SiteNav() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let idleTimer: number | null = null;

    // No rAF-gating here: the per-event work is one subtraction and a
    // setState React already bails out of when the value hasn't changed,
    // nowhere near the cost of e.g. the sphere's per-frame layout — so
    // throttling would add complexity without a real performance need.
    function onScroll() {
      const y = window.scrollY;
      const delta = y - lastY;

      // Any scroll activity postpones the "stopped" reveal; it only fires
      // once events stop arriving for IDLE_REVEAL_MS.
      if (idleTimer !== null) window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => setHidden(false), IDLE_REVEAL_MS);

      if (Math.abs(delta) > DIRECTION_THRESHOLD) {
        setHidden(delta > 0);
        lastY = y;
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (idleTimer !== null) window.clearTimeout(idleTimer);
    };
  }, []);

  return (
    <header className={`${styles.nav} ${hidden ? styles.navHidden : ""}`}>
      <div className={`grid ${styles.navGrid}`}>
        <Link href="/" className={styles.brand}>
          {/* Source is 166x74; width/height just declare that ratio for
              next/image — actual display size is set by .brandLogo in CSS. */}
          <Image
            src="/images/desh-logo.png"
            alt="Desh"
            width={166}
            height={74}
            className={styles.brandLogo}
            priority
          />
        </Link>
        <nav className={styles.links} aria-label="Primary">
          <a href="#services" className={styles.link}>
            Services
          </a>
          <a href="#wealth-bloom" className={styles.link}>
            SIP Calculator
          </a>
          <a href="#contact" className={styles.contactCta}>
            Contact us
          </a>
        </nav>
      </div>
    </header>
  );
}
