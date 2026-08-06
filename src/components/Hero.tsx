"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import type { MotionProps } from "motion/react";
import { TextRotate } from "@/components/ui/text-rotate";
import Button from "@/components/ui/Button";
import { heroFrameFilledRef } from "@/lib/heroProgress";
import styles from "./Hero.module.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger);
}

// Spotlight reveal — unchanged from original
const SPOTLIGHT_R = 260;

// On-load text reveal (motion/react)
const REVEAL_HEADING_DELAY = 0.15;

// The heading renders as two separate TextRotate spans ("Invest like a
// true" and "global citizen") so each can be staggered independently.
// TextRotate's word-splitting staggers one item per word (no separate items
// for the spaces between them), so "Invest like a true" is 4 staggered
// items at the heading's own per-word stagger — 0.05 / speedReveal-
// equivalent(1.2) — and the second span's delay continues that same
// cascade instead of restarting it. Same trick as OUTRO_LINE2_DELAY below.
const HEADING_STAGGER = 0.05 / 1.2;
const HEADING_LINE1_WORDS = 4;
const REVEAL_HEADING_LINE2_DELAY =
  REVEAL_HEADING_DELAY + HEADING_LINE1_WORDS * HEADING_STAGGER;

// The pin covers exactly the spotlight-zoom/frame-fill/outro sequence — one
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

// How long the white-margin frame takes to fill the viewport, in the
// timeline's absolute units (1.0 per 150%, see above). heroContent's own
// fade-out starts right after, at this same position, so the two aren't
// racing each other. HERO_FRAME_FILL_PROGRESS is the same point expressed
// as ScrollTrigger's own 0..1 progress, for SiteNav (see heroProgress.ts) —
// derived, not hand-copied, so it can't drift out of sync with the tween.
const FRAME_FILL_DURATION = 0.2;
const HERO_FRAME_FILL_PROGRESS = FRAME_FILL_DURATION / (TOTAL_SCROLL_PCT / ZOOM_SCROLL_PCT);

// Line 1 is 2 words ("Distance" / "shouldn't,") at the same per-word
// stagger as the heading, so line 2 starts at 2 * HEADING_STAGGER to keep
// the word cascade continuous across the break.
const OUTRO_LINE2_DELAY = 2 * HEADING_STAGGER;

// Faster, non-staggered exit on scroll-back — TextRotate's exit is a single
// flat target (unlike TextReveal's container/item variants), so the reverse
// per-character cascade the old exit had is simplified to one quick fade.
const OUTRO_EXIT: MotionProps["exit"] = {
  opacity: 0,
  y: 20,
  filter: "blur(12px)",
  transition: { duration: 0.15, ease: "easeIn" },
};

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

      // Read the white-margin frame's starting size from CSS (see
      // .hero's --hero-frame-inset/--hero-frame-radius) rather than
      // hardcoding it here, so the responsive breakpoints stay the single
      // source of truth. Captured as a plain object, not a ref, because
      // clip-path's inset()/round syntax isn't one of GSAP's built-in
      // animatable properties — it's tweened as two numbers and written to
      // the element manually in onUpdate below. Top edge only — matches
      // .zoomWrap's own pre-hydration clip-path (see Hero.module.css),
      // which leaves right/bottom/left flush from the start.
      const zoomWrapEl = zoomWrapRef.current;
      const heroFrameStyle = getComputedStyle(heroRef.current);
      const frame = {
        topInset: parseFloat(heroFrameStyle.getPropertyValue("--hero-frame-inset")) || 0,
        topRadius: parseFloat(heroFrameStyle.getPropertyValue("--hero-frame-radius")) || 0,
      };

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

            // SiteNav reads this to hold off hiding until the white-margin
            // frame has finished filling the viewport (see heroProgress.ts).
            heroFrameFilledRef.current = self.progress >= HERO_FRAME_FILL_PROGRESS;

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
        // White-margin frame snaps to full-bleed first. heroContent (and
        // SiteNav, via heroFrameFilledRef) only start fading once this is
        // done, so the frame settling and the copy leaving never fight for
        // attention at the same time — they go out one after the other.
        .to(
          frame,
          {
            topInset: 0,
            topRadius: 0,
            ease: "none",
            duration: FRAME_FILL_DURATION,
            onUpdate: () => {
              zoomWrapEl.style.clipPath = `inset(${frame.topInset}px 0 0 0 round ${frame.topRadius}px ${frame.topRadius}px 0 0)`;
            },
          },
          0
        )
        .to(
          heroContentRef.current,
          { opacity: 0, y: -40, ease: "none", duration: 0.25 },
          FRAME_FILL_DURATION
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
          <h1 className={styles.heroHeading}>
            {/* animatePresenceInitial: trigger is never gated here (always
                true from mount), so this content IS present at
                AnimatePresence's own first render — without this, its
                default (false) would skip the enter animation entirely
                and the words would just pop in instead of staggering. */}
            <TextRotate
              texts={["Invest like a true"]}
              delay={REVEAL_HEADING_DELAY}
              staggerDuration={HEADING_STAGGER}
              splitBy="words"
              auto={false}
              loop={false}
              animatePresenceInitial
            />{" "}
            <TextRotate
              texts={["global citizen"]}
              delay={REVEAL_HEADING_LINE2_DELAY}
              staggerDuration={HEADING_STAGGER}
              splitBy="words"
              auto={false}
              loop={false}
              animatePresenceInitial
            />
          </h1>
          <p className={styles.heroSubtext}>
            Crafted specifically for NRIs to help them grow your wealth in top global
            asset classes.
          </p>
          <Button type="button" className={styles.heroCta}>
            Talk to an Advisor
          </Button>
        </div>
      </div>
      <div className={styles.heroOutro}>
        <div className="grid">
          <div className={styles.heroOutroInner}>
            <h2 className={styles.heroOutroText}>
              <TextRotate
                mainClassName={styles.heroOutroLine}
                texts={["Distance shouldn't,"]}
                staggerDuration={HEADING_STAGGER}
                splitBy="words"
                auto={false}
                loop={false}
                trigger={showOutro}
                exit={OUTRO_EXIT}
              />
              <TextRotate
                mainClassName={styles.heroOutroLine}
                texts={["slow your money down."]}
                staggerDuration={HEADING_STAGGER}
                splitBy="words"
                auto={false}
                loop={false}
                delay={OUTRO_LINE2_DELAY}
                trigger={showOutro}
                exit={OUTRO_EXIT}
              />
            </h2>
          </div>
        </div>
      </div>
    </main>
  );
}
