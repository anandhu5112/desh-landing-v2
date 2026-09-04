"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { heroIntroSettledRef } from "@/lib/heroProgress";
import ContactModal from "./ContactModal";
import styles from "./SiteNav.module.css";

// Sub-pixel/trackpad noise shouldn't flip direction; only a real scroll counts.
const DIRECTION_THRESHOLD = 4;
// How long scrolling has to be still before the "stopped" reveal kicks in.
const IDLE_REVEAL_MS = 150;
// Matches the .links/.menuButton swap in SiteNav.module.css.
const MOBILE_MAX = 640;

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
 *
 * On phones the menu is *inside* the pill rather than a card floating below
 * it: opening grows the pill itself out to the page gutters and down over
 * the links (modelled on bevel.health). That's why the markup nests the
 * toggle row and the menu in a shared .pill — they're one surface.
 */
export default function SiteNav() {
  const [hidden, setHidden] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const menuWrapRef = useRef<HTMLDivElement>(null);
  // Read by listeners that are registered once and so can't close over state.
  const menuOpenRef = useRef(false);

  useEffect(() => {
    menuOpenRef.current = menuOpen;
  }, [menuOpen]);

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

      if (menuOpenRef.current) {
        // The open menu is part of the pill now, so hiding the nav would
        // slide the menu off-screen with it. Keep lastY current so closing
        // the menu doesn't then register one giant delta.
        setHidden(false);
        lastY = y;
      } else if (!heroIntroSettledRef.current) {
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

  /**
   * The collapsed pill is sized by its own content (logo + toggle), but the
   * open pill animates out to the page gutters — and `width` has no
   * transition from `max-content` to a length. So measure the natural
   * collapsed width and pin it as --pill-w, giving the transition two real
   * lengths to interpolate between.
   */
  useEffect(() => {
    const pill = pillRef.current;
    if (!pill) return;

    function measure() {
      if (!pill) return;
      if (window.innerWidth > MOBILE_MAX) {
        // Desktop lays the links out inline; an open state can't survive here.
        setMenuOpen(false);
        return;
      }
      if (menuOpenRef.current) return;

      const wrap = menuWrapRef.current;
      // Drop back to the max-content fallback so the read below is the
      // content width and not the value we last wrote. The panel has to come
      // out of flow for it too: collapsed it is zero-height, but its widest
      // row ("SIP Calculator", the CTA) still drives the pill's max-content
      // width, which would measure well wider than the toggle row.
      pill.style.removeProperty("--pill-w");
      if (wrap) wrap.style.display = "none";
      const width = pill.getBoundingClientRect().width;
      if (wrap) wrap.style.display = "";

      pill.style.setProperty("--pill-w", `${Math.ceil(width)}px`);
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header ref={navRef} className={`${styles.nav} ${hidden ? styles.navHidden : ""}`}>
      <div className={styles.navShell}>
        <div ref={pillRef} className={`${styles.pill} ${menuOpen ? styles.pillOpen : ""}`}>
          <div className={styles.pillRow}>
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

            {/* Mobile-only stand-in for .links (hidden above 640px, see
                SiteNav.module.css) — same links, collapsed behind a toggle
                since the full row no longer fits at phone widths. The three
                bars rotate into an X rather than being swapped for a
                different icon, so the mark morphs instead of popping. */}
            <button
              type="button"
              className={styles.menuButton}
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              <span className={styles.menuBar} />
              <span className={styles.menuBar} />
              <span className={styles.menuBar} />
            </button>
          </div>

          {/* Stays mounted even when collapsed — the open/close morph is a
              CSS transition, which needs both ends of it in the DOM. `inert`
              keeps its links out of tab order and the a11y tree meanwhile. */}
          <div
            ref={menuWrapRef}
            className={styles.mobileMenuWrap}
            aria-hidden={!menuOpen}
            inert={!menuOpen}
          >
            <nav id="mobile-nav-menu" className={styles.mobileMenu} aria-label="Mobile">
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
          </div>
        </div>
      </div>
      <ContactModal open={contactOpen} onClose={() => setContactOpen(false)} />
    </header>
  );
}
