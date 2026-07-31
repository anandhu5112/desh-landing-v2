"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { Variants } from "motion/react";
import { TextReveal } from "@/components/ui/text-reveal";
import GrowSection from "./GrowSection";
import UsSection from "./UsSection";
import styles from "./Hero.module.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger);
}

// Spotlight reveal — unchanged from original
const SPOTLIGHT_R = 260;

// On-load text reveal (motion/react) — heading leads, subtext follows
const REVEAL_HEADING_DELAY = 0.15;
const REVEAL_SUBTEXT_DELAY = 0.8;

// The zoom itself always occupies the first 150% of scroll; the pin is then
// extended for each stage that follows (card rise, then horizontal scroll).
// The timeline duration grows in lockstep (1.0 per 150%), so the
// time-per-pixel ratio never changes — 1.0/1167 === 2.0/2334 === 3.0/3501 —
// and every pre-existing tween keeps its exact scroll mapping.
const ZOOM_SCROLL_PCT = 150;
const TOTAL_SCROLL_PCT = 450;
const ZOOM_END = `+=${TOTAL_SCROLL_PCT}%`;

// Progress at which the second-section statement reveals. This is a fraction
// of the *whole* scroll range, so it must be rescaled whenever the range grows
// — derived here rather than hand-tuned so it can't drift out of sync again.
// 0.85 of the zoom's own 150% == the same absolute scroll pixel (~992px).
const OUTRO_REVEAL_AT = 0.85 * (ZOOM_SCROLL_PCT / TOTAL_SCROLL_PCT);

// Faster exit on scroll-back. Only the `exit` key is overridden, so the
// preset's enter animation (hidden/visible) is left untouched.
const OUTRO_EXIT_CONTAINER: Variants = {
  exit: { transition: { staggerChildren: 0.015, staggerDirection: -1 } },
};

// Line 1 is 3 segments ("Distance" / " " / "shouldn't,") and the stagger is
// 0.05 / speedReveal(1.2) = 0.0417s, so line 2 starts at 3 * 0.0417 to keep
// the word cascade continuous across the break.
const OUTRO_LINE2_DELAY = 0.125;

const OUTRO_EXIT_ITEM: Variants = {
  exit: {
    filter: "blur(12px)",
    opacity: 0,
    y: 20,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

const ZOOM_SCALE = 1.6;
const ZOOM_Y_PERCENT = 30;

export default function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const zoomWrapRef = useRef<HTMLDivElement>(null);
  const heroContentRef = useRef<HTMLDivElement>(null);
  const growBgRef = useRef<HTMLDivElement>(null);
  const growCardRef = useRef<HTMLDivElement>(null);
  const hTrackRef = useRef<HTMLDivElement>(null);
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
        !growBgRef.current ||
        !growCardRef.current ||
        !hTrackRef.current ||
        !sunRef.current
      )
        return;

      // Full opacity from the outset — the card is hidden by position, not fade.
      gsap.set(growCardRef.current, { opacity: 1 });

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
        .to(heroContentRef.current, { opacity: 0, y: -40, ease: "none", duration: 0.25 }, 0)
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
        .fromTo(
          sunRef.current,
          { yPercent: 120 },
          { yPercent: 0, ease: "none", duration: 0.35 },
          0.5
        )
        // --- Third section. Appended at absolute positions >= 1.0 so the three
        // tweens above keep their exact scroll mapping. The last tween MUST end
        // on exactly 2.0: the timeline duration is what pins the time-per-pixel
        // ratio, so a shorter end would silently shift everything above.
        // Slides in at full opacity — no fade. It is hidden purely by sitting
        // one viewport below the fold at yPercent: 100.
        .fromTo(
          growCardRef.current,
          { yPercent: 100 },
          { yPercent: 0, ease: "none", duration: 0.75 },
          1.0
        )
        .to(growBgRef.current, { opacity: 1, ease: "none", duration: 0.6 }, 1.4)
        // --- Fourth section. Slides the two-panel track left by one full
        // viewport. Runs 2.0 -> 3.0, so the timeline ends on exactly 3.0 and
        // everything above keeps its scroll mapping.
        .to(hTrackRef.current, { xPercent: -50, ease: "none", duration: 1.0 }, 2.0);
    },
    { scope: heroRef }
  );

  return (
    <main ref={heroRef} className={styles.hero}>
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
        <div className="grid">
          <TextReveal
            as="h1"
            className={styles.heroHeading}
            delay={REVEAL_HEADING_DELAY}
            per="word"
            preset="fade-in-blur"
            speedReveal={1.2}
          >
            Invest like a true global citizen
          </TextReveal>
          <div className={styles.heroAside}>
            <TextReveal
              as="p"
              className={styles.heroSubtext}
              delay={REVEAL_SUBTEXT_DELAY}
              per="word"
              preset="fade-in-blur"
              speedReveal={2.2}
            >
              Crafted specifically for NRIs to help them grow your wealth in top global
              asset classes.
            </TextReveal>
            <button type="button" className={styles.heroCta}>
              Talk to an Advisor
            </button>
          </div>
        </div>
      </div>
      <div className={styles.heroOutro}>
        <div className="grid">
          <div className={styles.heroOutroInner}>
            <h2 className={styles.heroOutroText}>
              <TextReveal
                as="span"
                className={styles.heroOutroLine}
                per="word"
                preset="fade-in-blur"
                speedReveal={1.2}
                trigger={showOutro}
                variants={{
                  container: OUTRO_EXIT_CONTAINER,
                  item: OUTRO_EXIT_ITEM,
                }}
              >
                {"Distance shouldn't,"}
              </TextReveal>
              <TextReveal
                as="span"
                className={styles.heroOutroLine}
                per="word"
                preset="fade-in-blur"
                speedReveal={1.2}
                delay={OUTRO_LINE2_DELAY}
                trigger={showOutro}
                variants={{
                  container: OUTRO_EXIT_CONTAINER,
                  item: OUTRO_EXIT_ITEM,
                }}
              >
                {"slow your money down."}
              </TextReveal>
            </h2>
          </div>
        </div>
      </div>
      <div ref={growBgRef} className={styles.growBg} />
      <div ref={growCardRef} className={styles.growCard}>
        <div ref={hTrackRef} className={styles.hTrack}>
          <div className={styles.hPanel}>
            <GrowSection />
          </div>
          <div className={styles.hPanel}>
            <UsSection />
          </div>
        </div>
      </div>
    </main>
  );
}
