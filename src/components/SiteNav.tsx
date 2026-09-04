"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { List, X } from "@phosphor-icons/react/dist/ssr";
import { heroIntroSettledRef } from "@/lib/heroProgress";
import ContactModal from "./ContactModal";
import styles from "./SiteNav.module.css";

// Sub-pixel/trackpad noise shouldn't flip direction; only a real scroll counts.
const DIRECTION_THRESHOLD = 4;
// How long scrolling has to be still before the "stopped" reveal kicks in.
const IDLE_REVEAL_MS = 150;

/**
 * Persistent top navigation — one centered black pill (logo, links, and
 * Contact us all inside it, per Figma node 297:6248), not a full-width row.
 * Hides on scroll-down, reappears on scroll-up or once scrolling stops —
 * both are driven off native window scroll, which is what GSAP's
 * ScrollTrigger scrub reads too.
 *
 * The whole pill always carries its own black background, so — unlike the
 * previous bare-logo-on-the-left layout — nothing here needs to track what
 * section is behind it; it's legible over anything.
 *
 * One exception: through Hero's opening beat, hiding is suppressed entirely
 * (see heroIntroSettledRef) so the nav stays in place and only starts fading
 * — together with the hero heading/CTA, which are on the same gate — once
 * that beat is done.
 */
export default function SiteNav() {
  const [hidden, setHidden] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let lastY = window.scrollY;
    let idleTimer: number | null = null;

    // No rAF-gating here: the per-event work is a handful of getBoundingClientRect
    // reads and a setState React already bails out of when the value hasn't
    // changed, nowhere near the cost of e.g. the sphere's per-frame layout —
    // so throttling would add complexity without a real performance need.
    function onScroll() {
      const y = window.scrollY;
      const delta = y - lastY;

      // Any scroll activity postpones the "stopped" reveal; it only fires
      // once events stop arriving for IDLE_REVEAL_MS.
      if (idleTimer !== null) window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => setHidden(false), IDLE_REVEAL_MS);

      if (!heroIntroSettledRef.current) {
        // Hero's still in its opening beat — stay put regardless of delta.
        setHidden(false);
      } else if (Math.abs(delta) > DIRECTION_THRESHOLD) {
        setHidden(delta > 0);
        lastY = y;
      }
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (idleTimer !== null) window.clearTimeout(idleTimer);
    };
  }, []);

  return (
    <header ref={navRef} className={`${styles.nav} ${hidden ? styles.navHidden : ""}`}>
      {/* Positioning context for the mobile dropdown: without it the menu is
          a flex sibling of .pill and lands *beside* the logo pill rather than
          under the toggle. */}
      <div className={styles.navShell}>
        <div className={styles.pill}>
          <Link href="/" className={styles.brand}>
            {/* Source is 63x20.5 (~3.07:1). Height-constrained, width auto, so
                it scales proportionally regardless of the intrinsic width/
                height next/image needs. */}
            <Image
              src="/images/desh-logo-mark.svg"
              alt="Desh"
              width={63}
              height={21}
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
            <button
              type="button"
              className={styles.contactCta}
              onClick={() => setContactOpen(true)}
            >
              Contact us
            </button>
          </nav>

          {/* Mobile-only stand-in for .links (hidden below 640px, see
              SiteNav.module.css) — same links, collapsed behind a toggle
              since the full row no longer fits at phone widths. */}
          <button
            type="button"
            className={styles.menuButton}
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X size={20} weight="bold" /> : <List size={20} weight="bold" />}
          </button>
        </div>

        {menuOpen && (
          <nav id="mobile-nav-menu" className={styles.mobileMenu} aria-label="Primary">
            <a href="#services" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
              Services
            </a>
            <a href="#wealth-bloom" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
              SIP Calculator
            </a>
            <button
              type="button"
              className={styles.mobileContactCta}
              onClick={() => {
                setMenuOpen(false);
                setContactOpen(true);
              }}
            >
              Contact us
            </button>
          </nav>
        )}
      </div>
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </header>
  );
}
