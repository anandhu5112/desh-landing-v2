"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import Button from "@/components/ui/Button";
import { heroIntroSettledRef } from "@/lib/heroProgress";
import styles from "./Hero.module.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger);
}

// Spotlight reveal — unchanged from original
const SPOTLIGHT_R = 260;

// The pin covers exactly the spotlight/zoom/outro sequence — one
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
// see above): the hero holds still while the spotlight layer fades, before
// heroContent starts leaving. The hero frame itself no longer animates —
// it's a static 32px margin (see .heroFrame) that the whole interaction
// plays inside — but this beat still paces what follows.
// HERO_INTRO_SETTLED_PROGRESS is the same point expressed as ScrollTrigger's
// own 0..1 progress, for SiteNav (see heroProgress.ts) — derived, not
// hand-copied, so it can't drift out of sync.
const INTRO_HOLD_DURATION = 0.2;
const HERO_INTRO_SETTLED_PROGRESS =
  INTRO_HOLD_DURATION / (TOTAL_SCROLL_PCT / ZOOM_SCROLL_PCT);

const ZOOM_SCALE = 1.6;
const ZOOM_Y_PERCENT = 30;

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const zoomWrapRef = useRef<HTMLDivElement>(null);
  const heroContentRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgLayerRef = useRef<HTMLDivElement>(null);
  const sunRef = useRef<HTMLDivElement>(null);
  const loopControlRef = useRef<{ start: () => void; stop: () => void } | null>(null);
  const outroShownRef = useRef(false);
  const [showOutro, setShowOutro] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const imgLayer = imgLayerRef.current;
    if (!canvas || !imgLayer) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resizeCanvas() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const mouse = { x: -999, y: -999 };
    const smooth = { x: -999, y: -999 };

    function handleMouseMove(e: MouseEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }
    window.addEventListener("mousemove", handleMouseMove);

    function handleMouseOut(e: MouseEvent) {
      if (!e.relatedTarget) {
        mouse.x = -999;
        mouse.y = -999;
      }
    }
    document.addEventListener("mouseout", handleMouseOut);

    let rafId: number | null = null;

    function loop() {
      smooth.x += (mouse.x - smooth.x) * 0.1;
      smooth.y += (mouse.y - smooth.y) * 0.1;

      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      const grad = ctx!.createRadialGradient(
        smooth.x,
        smooth.y,
        0,
        smooth.x,
        smooth.y,
        SPOTLIGHT_R
      );
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.4, "rgba(255,255,255,1)");
      grad.addColorStop(0.6, "rgba(255,255,255,0.75)");
      grad.addColorStop(0.75, "rgba(255,255,255,0.4)");
      grad.addColorStop(0.88, "rgba(255,255,255,0.12)");
      grad.addColorStop(1, "rgba(255,255,255,0)");

      ctx!.beginPath();
      ctx!.arc(smooth.x, smooth.y, SPOTLIGHT_R, 0, Math.PI * 2);
      ctx!.fillStyle = grad;
      ctx!.fill();

      const dataUrl = canvas!.toDataURL();
      imgLayer!.style.setProperty("-webkit-mask-image", `url(${dataUrl})`);
      imgLayer!.style.setProperty("mask-image", `url(${dataUrl})`);
      imgLayer!.style.setProperty("-webkit-mask-size", "100% 100%");
      imgLayer!.style.setProperty("mask-size", "100% 100%");

      rafId = requestAnimationFrame(loop);
    }

    function startLoop() {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(loop);
    }

    function stopLoop() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    loopControlRef.current = { start: startLoop, stop: stopLoop };
    startLoop();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseout", handleMouseOut);
      stopLoop();
    };
  }, []);

  useGSAP(
    () => {
      if (
        !heroRef.current ||
        !zoomWrapRef.current ||
        !imgLayerRef.current ||
        !heroContentRef.current ||
        !sunRef.current
      )
        return;

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
          // Drive the spotlight loop off actual scroll progress. onEnter/onLeaveBack
          // are unreliable here: pinning resolves `start` to -0.001, so the trigger is
          // already active at scroll 0 and onEnter re-fires on every refresh.
          onUpdate: (self) => {
            if (self.progress > 0.001) loopControlRef.current?.stop();
            else loopControlRef.current?.start();

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
        },
      });

      tl.to(imgLayerRef.current, { opacity: 0, ease: "none", duration: 0.3 }, 0)
        // The copy leaves only after the opening hold, so the spotlight
        // fading out and the copy leaving never compete for attention —
        // they go one after the other.
        .to(
          heroContentRef.current,
          { opacity: 0, y: -40, ease: "none", duration: 0.25 },
          INTRO_HOLD_DURATION
        )
        .to(
          zoomWrapRef.current,
          { scale: ZOOM_SCALE, yPercent: ZOOM_Y_PERCENT, ease: "none", duration: 0.9 },
          0.1
        )
        // Sun rises from behind the hills as the outro statement lands.
        // top.png's horizon isn't a hard edge — it's a feathered alpha
        // gradient (~43%-53% down), so yPercent: 50 (half the sun's own
        // height) isn't enough clearance; the top.png stayed only partly
        // opaque right where the sun's edge sat, letting it bleed through.
        // 120 clears the whole feather band with margin. Settles at 0.85,
        // matching OUTRO_REVEAL_AT — never on screen at the same time as
        // the spotlight layer, which has already faded out by 0.3.
        // Sun rise is the timeline's last beat — GrowSection/UsSection pick
        // up as regular vertical sections once the pin releases, not as
        // further stages of this timeline.
        .fromTo(
          sunRef.current,
          { yPercent: 120 },
          { yPercent: 0, ease: "none", duration: 0.35 },
          0.5
        );
    },
    { scope: heroRef }
  );

  return (
    <main ref={heroRef} className={styles.hero}>
      {/* Every layer of the interaction lives inside this frame, so the zoom,
          the sun and the outro statement are all clipped to the same 32px
          margin and share one coordinate space. */}
      <div className={styles.heroFrame}>
        <div ref={zoomWrapRef} className={styles.zoomWrap}>
          <div ref={sunRef} className={styles.sun} />
          <div
            className={styles.heroBaseImg}
            style={{ backgroundImage: "url('/images/top.png')" }}
          />
          <canvas ref={canvasRef} className={styles.revealCanvas} />
          <div
            ref={imgLayerRef}
            className={styles.heroRevealImg}
            style={{ backgroundImage: "url('/images/base.png')" }}
          />
        </div>
        <div ref={heroContentRef} className={styles.heroContent}>
          <div className={styles.heroInner}>
            <h1 className={styles.heroHeading}>Invest like a true global citizen</h1>
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
                <span className={styles.heroOutroLine}>Distance shouldn&apos;t,</span>
                <span className={styles.heroOutroLine}>slow your money down.</span>
              </h2>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
