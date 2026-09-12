"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useContactModal } from "./ContactModalProvider";
import { NAV_PILL_ID, useGlassConfig } from "./GlassContext";
import { wantsYbouaneGlass } from "@/lib/ybouaneGlass";
import styles from "./SiteNav.module.css";

// Matches the .links/.menuButton swap in SiteNav.module.css.
const MOBILE_MAX = 640;

/**
 * Persistent top navigation — one centered black pill (logo, links, and
 * Contact us all inside it, per Figma node 297:6248), not a full-width row.
 * Fixed in place for the whole page: it does not hide on scroll-down. It used
 * to, reappearing on scroll-up or once scrolling stopped, which meant the
 * glass lens under it had to chase a moving target every frame.
 *
 * The pill carries a translucent scrim tuned over the hero. Its contrast
 * over light sections remains a separate design concern.
 *
 * On phones the menu is *inside* the pill rather than a card floating below
 * it: opening grows the pill itself out to the page gutters and down over
 * the links (modelled on bevel.health). That's why the markup nests the
 * toggle row and the menu in a shared .pill — they're one surface.
 */
export default function SiteNav() {
  const [menuOpen, setMenuOpen] = useState(false);
  // The modal itself is mounted once by ContactModalProvider — the nav is no
  // longer the only way in, so it no longer owns the open state either.
  const { open: openContact, prefetchBooking } = useContactModal();
  const navRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const menuWrapRef = useRef<HTMLDivElement>(null);
  // Read by listeners that are registered once and so can't close over state.
  const menuOpenRef = useRef(false);

  useEffect(() => {
    menuOpenRef.current = menuOpen;
  }, [menuOpen]);

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
      // row (the "Let's talk money" CTA) still drives the pill's
      // max-content width, which would measure well wider than the toggle row.
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

  const { config, safariPill } = useGlassConfig();
  const [safariGlass, setSafariGlass] = useState(false);
  useEffect(() => {
    setSafariGlass(wantsYbouaneGlass());
  }, []);
  const pillChrome = safariGlass ? safariPill : config;

  // #services/#community only exist on the homepage's own sections — from
  // any other route (e.g. /manifesto) the bare hash would target nothing,
  // so route back home first.
  const pathname = usePathname();
  const onHome = pathname === "/";
  const servicesHref = onHome ? "#services" : "/#services";
  const communityHref = onHome ? "#community" : "/#community";

  const pill = (
    <div
      // ScrollRoot's glass lens observes this element's size to sit
      // exactly under it — see ScrollRoot.tsx. YbouaneNavGlass and
      // WebKitNavGlass track the same box on Safari.
      id={NAV_PILL_ID}
      ref={pillRef}
      className={`${styles.pill} ${menuOpen ? styles.pillOpen : ""} ${safariGlass ? "" : styles.chromePill}`}
      style={
        {
          "--glass-blur": `${config.blur}px`,
          "--glass-opacity": pillChrome.opacity,
          "--glass-saturate": config.saturate,
          "--glass-contrast": config.contrast,
          "--glass-rim-light": `rgba(255, 255, 255, ${pillChrome.rimLight})`,
          "--glass-shadow-opacity": pillChrome.shadowOpacity,
        } as CSSProperties
      }
    >
      <div className={styles.pillRow}>
        <Link href="/" className={styles.brand}>
          {/* Decorative: the logotype beside it already carries the name. */}
          <Image
            src="/images/desh-logo-symbol.svg"
            alt=""
            width={62}
            height={58}
            className={styles.brandSymbol}
            aria-hidden="true"
            priority
          />
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
          <Link href="/manifesto" className={styles.link}>
            Manifesto
          </Link>
          <a href={servicesHref} className={styles.link}>
            Company
          </a>
          <a href={communityHref} className={styles.link}>
            Community
          </a>
          <button
            type="button"
            className={styles.contactCta}
            onClick={() => openContact({ tab: "contact" })}
            onMouseEnter={prefetchBooking}
            onFocus={prefetchBooking}
          >
            Let’s talk money
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
          <Link href="/manifesto" className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
            Manifesto
          </Link>
          <a href={servicesHref} className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
            Company
          </a>
          <a href={communityHref} className={styles.mobileLink} onClick={() => setMenuOpen(false)}>
            Community
          </a>
          <button
            type="button"
            className={styles.mobileContactCta}
            onClick={() => {
              setMenuOpen(false);
              openContact({ tab: "contact" });
            }}
            onFocus={prefetchBooking}
          >
            Let’s talk money
          </button>
        </nav>
      </div>
    </div>
  );

  return (
    <header ref={navRef} className={styles.nav}>
      <div className={styles.navShell}>{pill}</div>
    </header>
  );
}
