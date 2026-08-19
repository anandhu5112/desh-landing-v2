"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Button from "@/components/ui/Button";
import { heroIntroSettledRef } from "@/lib/heroProgress";
import { lenisRef } from "@/lib/lenis";
import styles from "./Hero.module.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger);
}

// The pin covers exactly the zoom/outro sequence — one
// timeline unit per 150% of scroll. GrowSection/UsSection are regular
// vertical sections below Hero now, not additional pinned stages, so the
// pin is no longer extended past this single unit.
const ZOOM_SCROLL_PCT = 150;
const TOTAL_SCROLL_PCT = ZOOM_SCROLL_PCT;
const ZOOM_END = `+=${TOTAL_SCROLL_PCT}%`;

// Progress at which the second-section statement reveals. This is a fraction
// of the *whole* scroll range, so it must be rescaled whenever the range grows
// — derived here rather than hand-tuned so it can't drift out of sync again.
// 0.85 of the zoom's own 150% == the same absolute scroll pixel (~992px).
const OUTRO_REVEAL_AT = 0.85 * (ZOOM_SCROLL_PCT / TOTAL_SCROLL_PCT);

// Opening beat of the pin, in the timeline's absolute units (1.0 per 150%,
// see above): the hero holds still before heroContent starts leaving. The
// hero frame itself no longer animates —
// it's a static 32px margin (see .heroFrame) that the whole interaction
// plays inside — but this beat still paces what follows.
// HERO_INTRO_SETTLED_PROGRESS is the same point expressed as ScrollTrigger's
// own 0..1 progress, for SiteNav (see heroProgress.ts) — derived, not
// hand-copied, so it can't drift out of sync.
const INTRO_HOLD_DURATION = 0.2;
const HERO_INTRO_SETTLED_PROGRESS =
  INTRO_HOLD_DURATION / (TOTAL_SCROLL_PCT / ZOOM_SCROLL_PCT);

// Third round of tuning this pair: 1.6/30 (original) zoomed in too
// aggressively by the time the sun/outro settled; 1.05/5 (round two)
// corrected that but was then overridden to 1.45/22 (round three) against
// a different, more-zoomed reference. A later, more specific reference
// confirmed near-1x — essentially the hero's own starting framing — is
// actually the intended stop point, so this reverts to round two's
// values. Also no longer needs to double as "the framing while the sun
// is still rising": the sun tween below now only starts once this one
// has fully finished (see the duration on the zoom .to() call), so
// there's no overlap state to account for.
const ZOOM_SCALE = 1.05;
const ZOOM_Y_PERCENT = 5;

// Same breakpoint the site's CSS already treats as "true phone", not the
// 1024px tablet one. Read once at tween-setup time (not reactively on
// resize, same tradeoff every other viewport-width check in this codebase
// makes) — only gates the two values below, so nothing else in the timeline
// changes shape between mobile and desktop.
const MOBILE_QUERY = "(max-width: 767px)";
// This dampened pair existed only because the old desktop target (1.45/22)
// pushed the hills at the bottom of the grassland image below the frame's
// own bottom edge on tall/narrow viewports (overflow: hidden clips it
// there, see .heroFrame). Desktop's own new target (see ZOOM_SCALE above)
// is now gentler than this pair ever was, so mobile just reuses it
// outright rather than keeping a second, now-backwards-dampened set of
// numbers — re-split these if a live check on a real tall viewport shows
// the hills clipping again.
const ZOOM_SCALE_MOBILE = ZOOM_SCALE;
const ZOOM_Y_PERCENT_MOBILE = ZOOM_Y_PERCENT;

// Once the pinned sequence finishes and the user scrolls past it, the
// finished outro (sun + copy, see the screenshot this was specced from)
// holds the viewport for this long before GrowSection/UsSection are
// allowed to scroll in underneath.
const OUTRO_HOLD_MS = 1500;

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const zoomWrapRef = useRef<HTMLDivElement>(null);
  const heroContentRef = useRef<HTMLDivElement>(null);
  const sunRef = useRef<HTMLDivElement>(null);
  const outroShownRef = useRef(false);
  const [showOutro, setShowOutro] = useState(false);
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useGSAP(
    () => {
      if (!heroRef.current || !zoomWrapRef.current || !heroContentRef.current || !sunRef.current)
        return;

      const isMobile = window.matchMedia(MOBILE_QUERY).matches;
      const zoomScale = isMobile ? ZOOM_SCALE_MOBILE : ZOOM_SCALE;
      const zoomYPercent = isMobile ? ZOOM_Y_PERCENT_MOBILE : ZOOM_Y_PERCENT;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: heroRef.current,
          start: "top top",
          end: ZOOM_END,
          scrub: 1,
          pin: true,
          // body is display:flex, which makes ScrollTrigger skip pin-spacing by default
          pinSpacing: true,
          anticipatePin: 1,
          onUpdate: (self) => {
            // SiteNav reads this to hold off hiding until the hero's
            // opening beat is done (see heroProgress.ts).
            heroIntroSettledRef.current = self.progress >= HERO_INTRO_SETTLED_PROGRESS;

            // Reveal the second-section statement as the zoom settles.
            // Guarded by a ref so we only re-render on an actual transition.
            const shouldShow = self.progress >= OUTRO_REVEAL_AT;
            if (shouldShow !== outroShownRef.current) {
              outroShownRef.current = shouldShow;
              setShowOutro(shouldShow);
            }
          },
          // Fires exactly once per forward crossing of the pin's end — right
          // as the finished outro state would otherwise start scrolling away.
          // Freezes Lenis there for OUTRO_HOLD_MS before releasing it, so the
          // hold re-triggers correctly too if the user scrolls back up into
          // the hero and forward past it again later.
          onLeave: () => {
            const lenis = lenisRef.current;
            // No Lenis instance under prefers-reduced-motion (see
            // SmoothScroll) — nothing to hold scroll with, so skip the hold
            // rather than leaving native scroll running unlocked.
            if (!lenis || holdTimeoutRef.current) return;

            lenis.stop();
            holdTimeoutRef.current = setTimeout(() => {
              lenis.start();
              holdTimeoutRef.current = null;
            }, OUTRO_HOLD_MS);
          },
        },
      });

      tl.to(
        heroContentRef.current,
        { opacity: 0, y: -40, ease: "none", duration: 0.25 },
        INTRO_HOLD_DURATION
      )
        .to(
          zoomWrapRef.current,
          { scale: zoomScale, yPercent: zoomYPercent, ease: "none", duration: 0.4 },
          0.1
        )
        // Sun rises only once the zoom above has fully finished (it runs
        // [0.1, 0.5]; this starts at 0.5) rather than overlapping it —
        // the zoom reaches its exact final scale/pan the instant before
        // the sun's first frame, so "the sun rises from behind the hills"
        // now means from a settled frame, not one still mid-zoom.
        // The hero bg's horizon isn't a hard edge — it's a feathered alpha
        // gradient (~43%-53% down), so yPercent: 50 (half the sun's own
        // height) isn't enough clearance; the image stayed only partly
        // opaque right where the sun's edge sat, letting it bleed through.
        // 120 clears the whole feather band with margin. Settles at 0.85,
        // matching OUTRO_REVEAL_AT.
        // Sun rise is the timeline's last beat — GrowSection/UsSection pick
        // up as regular vertical sections once the pin releases, not as
        // further stages of this timeline.
        .fromTo(
          sunRef.current,
          { yPercent: 120 },
          { yPercent: 0, ease: "none", duration: 0.35 },
          0.5
        );

      // Guards against a hold outliving the component it was scheduled by —
      // without this, an unmount mid-hold would call .start() on whatever
      // Lenis instance (or none) exists by the time the timer fires.
      return () => {
        if (holdTimeoutRef.current) {
          clearTimeout(holdTimeoutRef.current);
          holdTimeoutRef.current = null;
        }
      };
    },
    { scope: heroRef }
  );

  return (
    <main ref={heroRef} className={styles.hero}>
      {/* Every layer of the interaction lives inside this frame, so the zoom,
          the sun and the outro statement are all clipped to the same 32px
          margin and share one coordinate space. */}
      <div className={styles.heroFrame}>
        {/* Sits behind .zoomWrap, not inside it — static for the whole pin
            (no scale/pan, no scroll-driven tween) so it reads as a fixed
            sky backdrop the grassland's transparent areas and the rising
            sun both sit in front of. */}
        <div
          className={styles.heroSky}
          style={{ backgroundImage: "url('/images/hero-sky.png')" }}
        />
        <div ref={zoomWrapRef} className={styles.zoomWrap}>
          <div ref={sunRef} className={styles.sun} />
          <div
            className={styles.heroBaseImg}
            style={{ backgroundImage: "url('/images/hero-bg.png')" }}
          />
        </div>
        <div ref={heroContentRef} className={styles.heroContent}>
          <div className={styles.heroInner}>
            <h1 className={styles.heroHeading}>
              <span className={styles.dropCap}>I</span>nvest like a true global citizen
            </h1>
            <p className={styles.heroSubtext}>
              Crafted specifically for NRIs to help them grow their wealth in top global
              asset classes.
            </p>
            <Button type="button" className={styles.heroCta}>
              Talk to an Advisor
            </Button>
          </div>
        </div>
        {/* Always mounted, not conditionally rendered — a fade/rise needs the
            element present to transition; showOutro (driven by scroll
            progress in the pinned timeline's onUpdate above) now toggles a
            visibility class on .heroOutroInner instead of the element's own
            presence. aria-hidden keeps it out of the accessibility tree for
            the rest of the pin, matching what conditional mounting used to
            do for free. */}
        <div className={styles.heroOutro} aria-hidden={!showOutro}>
          <div className="grid">
            <div
              className={`${styles.heroOutroInner} ${showOutro ? styles.heroOutroInnerVisible : ""}`}
            >
              <h2 className={styles.heroOutroText}>
                <span className={styles.heroOutroLine}>
                  <span className={styles.dropCap}>D</span>istance shouldn&apos;t,
                </span>
                <span className={styles.heroOutroLine}>slow your money down.</span>
              </h2>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
