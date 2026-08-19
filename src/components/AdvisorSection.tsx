"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { animate, type AnimationSequence } from "motion";
import Button from "@/components/ui/Button";
import { springs, prefersReducedMotion } from "@/lib/motionPresets";
import styles from "./AdvisorSection.module.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, ScrollTrigger);
}

// "Total value" card's target figures — also the ceiling the count-up
// animation below runs to. Indian digit grouping, hand-rolled rather than
// Intl.NumberFormat: the section prerenders at build time and hydrates in
// the browser, and a Node build without full ICU groups differently than
// the browser, which would show up as a hydration mismatch on these
// numbers. Same technique BloomSection's own `inr()` uses, duplicated
// here rather than imported — copied, not shared, same as every other
// house convention in this file.
const TOTAL_VALUE = 2472480;
const TOTAL_VALUE_PERCENT = 12.84;
const TOTAL_VALUE_CHANGE = 509776;

function formatInr(value: number, prefix: string): string {
  const digits = Math.round(value).toString();
  const head = digits.slice(0, -3);
  const tail = digits.slice(-3);
  if (!head) return `${prefix}${tail}`;
  return `${prefix}${head.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${tail}`;
}

function formatPercent(value: number): string {
  return `+${value.toFixed(2)}%`;
}

/**
 * "Got questions about your money?" — Figma node 510:8616. Sits between
 * UsSection and GrowSection (see ServicesSection.tsx). Copied, not shared:
 * same house rule as every other section.
 *
 * Replaces the previous chat-bubble-field version of this section (Figma
 * node 469:1889) with a proof-style composition: left-aligned copy, an
 * advisor video-call photo, and an overlapping "insight card" that reads
 * like a live in-app notification.
 *
 * .mediaCluster's photo and insight card are positioned relative to EACH
 * OTHER (percentages of the photo's own box), not independently as
 * percentages of the card — two independent percentages only reproduce
 * Figma's overlap at Figma's own reference width, and drift apart into a
 * gap at any other size once the photo's max-width cap kicks in. Anchoring
 * the card to the photo's actual rendered box keeps the overlap exact at
 * any viewport width.
 *
 * The insight card itself plays a one-shot, scroll-triggered interaction
 * (not part of any Figma node — this is a custom sequence, sourced from
 * two separate Figma cards, 510:8616's "Portfolio Calibration Recommended"
 * and 510:8615's "Total value" graph): a cursor sweeps in over the photo,
 * clicks Approve, and the card crossfades + resizes from one face to the
 * other while the "Total value" figures count up and the graph line draws
 * itself in.
 *
 * GSAP's ScrollTrigger is used ONLY to detect the scroll crossing (it's
 * already wired site-wide to Lenis's smoothed scroll — see SmoothScroll
 * .tsx — so it's the one thing here worth keeping on GSAP). Every actual
 * animated value runs through motion's (Motion for React's vanilla
 * animate()) spring physics instead of GSAP tweens or CSS easing — see
 * src/lib/motionPresets.ts for the shared spring vocabulary this and every
 * other scripted animation on the site should reach for.
 */
export default function AdvisorSection() {
  const cardWrapRef = useRef<HTMLDivElement>(null);
  const mediaClusterRef = useRef<HTMLDivElement>(null);
  const faceARef = useRef<HTMLDivElement>(null);
  const faceBRef = useRef<HTMLDivElement>(null);
  const approveWrapRef = useRef<HTMLSpanElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const amountRef = useRef<HTMLParagraphElement>(null);
  const percentRef = useRef<HTMLSpanElement>(null);
  const changeRef = useRef<HTMLSpanElement>(null);
  const graphPathRef = useRef<SVGPathElement>(null);

  useGSAP(
    () => {
      const cardWrap = cardWrapRef.current;
      const mediaCluster = mediaClusterRef.current;
      const faceA = faceARef.current;
      const faceB = faceBRef.current;
      const approveWrap = approveWrapRef.current;
      const cursor = cursorRef.current;
      const amountEl = amountRef.current;
      const percentEl = percentRef.current;
      const changeEl = changeRef.current;
      const graphPath = graphPathRef.current;
      if (
        !cardWrap ||
        !mediaCluster ||
        !faceA ||
        !faceB ||
        !approveWrap ||
        !cursor ||
        !amountEl ||
        !percentEl ||
        !changeEl ||
        !graphPath
      ) {
        return;
      }

      // Both faces are always mounted (faceB sits absolutely positioned
      // beneath faceA, see .cardFaceB) so both have a real, measurable
      // height from the start — no need to defer measuring faceB's until
      // it's shown.
      const heightA = faceA.getBoundingClientRect().height;
      const heightB = faceB.getBoundingClientRect().height;
      const pathLength = graphPath.getTotalLength();

      // Plain style writes for the non-transform values — opacity/height/
      // SVG dash properties all read their "current" value straight off
      // computed style, so a direct write here is exactly equivalent to
      // what the animation will later read as its start point.
      cardWrap.style.height = `${heightA}px`;
      faceB.style.opacity = "0";
      graphPath.style.strokeDasharray = `${pathLength}`;
      graphPath.style.strokeDashoffset = `${pathLength}`;

      // Cursor lives in .mediaCluster, not inside the card itself, so it
      // can sweep in over the photo without being clipped by the card's
      // own overflow: hidden (needed to clip the height tween cleanly).
      // Target/start coordinates are read once at setup time relative to
      // .mediaCluster — same "measure once, not reactively" tradeoff as
      // every other viewport-dependent read in this codebase (see
      // Hero.tsx's MOBILE_QUERY check).
      const clusterRect = mediaCluster.getBoundingClientRect();
      const btnRect = approveWrap.getBoundingClientRect();
      const targetX = btnRect.left + btnRect.width / 2 - clusterRect.left;
      const targetY = btnRect.top + btnRect.height / 2 - clusterRect.top;

      // x/y are motion's own "independent transforms" — it tracks their
      // current value itself rather than parsing style.transform, so the
      // starting offset is set through animate() (an instant jump-set)
      // rather than a plain style write, to seed that internal tracking
      // correctly before the real animation reads "current value" as its
      // start point. type: "tween" is required here — x/y default to
      // type: "spring" when unspecified, and springs ignore `duration`
      // entirely (they're governed by stiffness/damping/mass instead), so
      // a bare `{ duration: 0 }` silently no-ops and leaves the cursor at
      // its unset default (opacity: 1, no transform) instead of hidden.
      animate(
        cursor,
        { x: targetX + 100, y: targetY + 80, opacity: 0 },
        { type: "tween", duration: 0 }
      );

      let activeSequence: ReturnType<typeof animate> | null = null;

      const playSequence = () => {
        if (prefersReducedMotion()) {
          // Content still needs to reach its end state — just no motion.
          // Jump every value straight to settled, all at once.
          cursor.style.opacity = "0";
          faceA.style.opacity = "0";
          faceB.style.opacity = "1";
          cardWrap.style.height = `${heightB}px`;
          amountEl.textContent = formatInr(TOTAL_VALUE, "₹ ");
          percentEl.textContent = formatPercent(TOTAL_VALUE_PERCENT);
          changeEl.textContent = formatInr(TOTAL_VALUE_CHANGE, "+₹");
          graphPath.style.strokeDashoffset = "0";
          return;
        }

        // Deliberately paced, with real holds between beats (see the "at"
        // offsets below) rather than back-to-back tweens, so each beat
        // (arrive, pause, click, pause, transform) reads as a distinct
        // moment. Every segment picks the spring preset whose weight
        // matches what's moving — see motionPresets.ts for what each one
        // is for.
        const sequence: AnimationSequence = [
          // The cursor arriving — an element entering the scene.
          [cursor, { x: targetX, y: targetY, opacity: 1 }, { ...springs.entrance }],
          // The click: cursor and button press down together, then
          // release — fast, minimal-overshoot feedback.
          [
            [cursor, approveWrap],
            { scale: 0.86 },
            { ...springs.interaction, at: "+0.45" },
          ],
          [[cursor, approveWrap], { scale: 1 }, { ...springs.interaction }],
          // Crossfade the two faces into each other.
          [faceA, { opacity: 0 }, { ...springs.smooth, at: "+0.35" }],
          [faceB, { opacity: 1 }, { ...springs.smooth, at: "<" }],
          // The card's own resize — a bigger, weightier structural move,
          // so it gets the slower "gentle" spring rather than "smooth".
          [cardWrap, { height: heightB }, { ...springs.gentle, at: "<" }],
          // Total value's figures count up and the graph line draws in
          // together, driven by one shared spring-eased progress value
          // (0 to 1) rather than three/four independent animations, so
          // they visibly move as a single coordinated reveal instead of
          // drifting out of sync with each other.
          [
            (progress: number) => {
              // "smooth" is intentionally a touch underdamped (see
              // motionPresets.ts), so progress briefly overshoots past 1
              // before settling — fine for the numbers (a barely-visible
              // flicker past the final digit), but a dashoffset that goes
              // negative wraps the dash pattern instead of just finishing
              // early, which reads as the line breaking rather than
              // completing. Clamped for display; the underlying spring
              // still overshoots, driving the motion itself.
              const shown = Math.min(Math.max(progress, 0), 1);
              amountEl.textContent = formatInr(shown * TOTAL_VALUE, "₹ ");
              percentEl.textContent = formatPercent(shown * TOTAL_VALUE_PERCENT);
              changeEl.textContent = formatInr(shown * TOTAL_VALUE_CHANGE, "+₹");
              graphPath.style.strokeDashoffset = `${pathLength * (1 - shown)}`;
            },
            [0, 1],
            { ...springs.smooth, at: "<" },
          ],
          // Cursor dismissal — quick and controlled, distinct from the
          // soft "entrance" spring it arrived on.
          [cursor, { opacity: 0 }, { ...springs.snappy, at: "-0.35" }],
        ];

        activeSequence = animate(sequence);
      };

      ScrollTrigger.create({
        trigger: cardWrap,
        start: "top 75%",
        once: true,
        onEnter: playSequence,
      });

      const onResize = () => ScrollTrigger.refresh();
      window.addEventListener("resize", onResize);

      // Stops (rather than lets run orphaned) if the component unmounts
      // mid-sequence — useGSAP's own automatic cleanup only knows about
      // GSAP-created things (the ScrollTrigger above), not this separate
      // motion animation.
      return () => {
        window.removeEventListener("resize", onResize);
        activeSequence?.stop();
      };
    },
    { scope: mediaClusterRef }
  );

  return (
    <section className={styles.section}>
      {/* Same asset and top-anchored cover-crop as the previous version of
          this section — only the card's own ratio changed (1376:657, up
          from 1376:569), matching Figma's taller card here. */}
      <div className={styles.frame}>
        <Image
          src="/images/advisor-sky.png"
          alt=""
          width={2000}
          height={1160}
          className={styles.bgImage}
        />

        <div className={styles.content}>
          <h2 className={styles.heading}>
            <span className={styles.dropCap}>G</span>ot questions about
            <br />
            your money?
          </h2>
          <p className={styles.subtext}>
            Whether you&apos;re starting your investment journey or managing a growing
            portfolio, receive personalised guidance whenever you need it.
          </p>
          <Button type="button" className={styles.cta}>
            Book a Free Consultation
          </Button>
        </div>

        <div className={styles.mediaCluster} ref={mediaClusterRef}>
          {/* Fixed background, per design direction — only the card below
              animates. Insight card lives inside .photo so its %-based
              overlap tracks the image box; .mediaCluster's padding-bottom
              (see CSS) reserves the card's overhang for vertical centering. */}
          <div className={styles.photo}>
            <div className={styles.photoClip}>
              <Image
                src="/images/advisor-video-call.png"
                alt="An investor on a video call with their Desh advisor"
                width={2000}
                height={1333}
                className={styles.photoImg}
              />
            </div>

            {/* A live-looking product moment, not a real alert — decorative,
                so it's hidden from assistive tech rather than announced as an
                actual notification needing action. overflow: hidden (see CSS)
                clips the crossfading faces during the height tween. */}
            <div className={styles.insightCard} ref={cardWrapRef} aria-hidden="true">
            <div className={styles.cardFaceA} ref={faceARef}>
              <Image
                src="/images/icon-portfolio-alert.svg"
                alt=""
                width={24}
                height={24}
              />

              <div className={styles.insightHead}>
                <p className={styles.insightTitle}>Portfolio Calibration Recommended</p>
                <div className={styles.insightStatus}>
                  <Image src="/images/icon-status-dot.svg" alt="" width={10} height={10} />
                  <span>Monitoring</span>
                </div>
              </div>

              <p className={styles.insightBody}>
                Markets are moving. Let&apos;s review your investments to keep them on
                track.
              </p>

              <div className={styles.insightFooter}>
                <div className={styles.advisorRow}>
                  {/* A dedicated crop of the advisor's face out of the video
                      call photo's own inset thumbnail (advisor-video-call.png)
                      — object-fit: cover on the full photo can't isolate just
                      that thumbnail, since it only occupies a small corner of
                      it. */}
                  <div className={styles.advisorAvatar}>
                    <Image
                      src="/images/advisor-avatar.png"
                      alt=""
                      width={470}
                      height={320}
                      className={styles.advisorAvatarImg}
                    />
                  </div>
                  <div className={styles.advisorInfo}>
                    <p className={styles.advisorReviewed}>
                      Reviewed by your advisor
                      <Image
                        src="/images/icon-verified-badge.svg"
                        alt=""
                        width={10}
                        height={10}
                      />
                    </p>
                    <p className={styles.advisorName}>Nikhil Mehra, CFA</p>
                  </div>
                </div>
                {/* Wrapped in a span (Button doesn't forward a ref) so the
                    click animation can measure and scale exactly this
                    button, not the whole footer row. */}
                <span className={styles.approveWrap} ref={approveWrapRef}>
                  <Button type="button" className={styles.cta}>
                    Approve
                  </Button>
                </span>
              </div>
            </div>

            {/* Figma node 510:8615 — what the card above turns into once
                the cursor clicks Approve. Amount/percent/change start at
                their real final text (correct for no-JS/pre-hydration) and
                get overwritten by the count-up once the sequence plays. */}
            <div className={styles.cardFaceB} ref={faceBRef}>
              <div className={styles.insightHead}>
                <p className={styles.totalValueLabel}>Total value</p>
                <div className={styles.insightStatus}>
                  <Image src="/images/icon-status-dot.svg" alt="" width={10} height={10} />
                  <span>Monitoring</span>
                </div>
              </div>

              <p className={styles.totalValueAmount} ref={amountRef}>
                ₹ 24,72,480
              </p>

              <div className={styles.totalValueMetaRow}>
                <div className={styles.totalValueChange}>
                  <span ref={percentRef}>+12.84%</span>
                  <span ref={changeRef}>+₹5,09,776</span>
                </div>
                <p className={styles.totalValueUpdated}>updated 2 mins ago</p>
              </div>

              {/* Inlined (not an <img src="...svg">) so its own <path> can
                  be targeted directly for the stroke-draw reveal — an
                  external image has no such hook, and needing to wait on
                  its own separate network load was exactly what caused
                  the clipping bug the width/height attrs below used to
                  guard against. width/height still reserve the intrinsic
                  aspect ratio the same way; harmless to keep. */}
              <div className={styles.graphWrap}>
                <svg
                  viewBox="0 0 508.532 120.536"
                  width={509}
                  height={121}
                  className={styles.graphImg}
                  fill="none"
                >
                  <path
                    ref={graphPathRef}
                    d="M0.531894 119.5L31.5016 103.595C32.9241 102.864 34.622 102.914 35.9987 103.728L40.8981 106.624C42.7742 107.733 45.1683 107.392 46.6609 105.804L48.9302 103.39C49.5256 102.756 50.2864 102.302 51.1265 102.079L56.7475 100.584C58.1737 100.205 59.6954 100.524 60.849 101.444L76.0883 113.604C76.9133 114.262 77.9374 114.62 78.9928 114.62H84.0852C84.9384 114.62 85.7753 114.855 86.5043 115.298L89.9308 117.381C91.9261 118.594 94.5113 118.142 95.9763 116.323L105.02 105.099C106.302 103.507 108.473 102.938 110.372 103.695L113.044 104.761C114.996 105.54 117.228 104.915 118.491 103.235L119.541 101.839C120.421 100.669 121.799 99.9809 123.263 99.9809H125.367C126.221 99.9809 127.057 99.7465 127.787 99.3033L132.433 96.4783C133.838 95.6245 135.589 95.5742 137.04 96.3461L140.377 98.1215C142.393 99.1935 144.888 98.6467 146.27 96.8301L161.204 77.2047C162.48 75.5277 164.723 74.9166 166.673 75.7146L175.311 79.2489C177.096 79.9793 179.147 79.5337 180.468 78.1283L188.602 69.475C189.969 68.0206 192.111 67.5992 193.927 68.4273L195.877 69.3166C197.694 70.1447 199.836 69.7233 201.203 68.2688L209.133 59.8325C211.027 57.8176 214.249 57.8873 216.054 59.9822L223.21 68.2873C224.464 69.7429 226.483 70.2788 228.294 69.6366L231.843 68.3781C234.011 67.6095 236.414 68.5378 237.502 70.5636L242.859 80.5357C243.924 82.5184 246.391 83.2669 248.378 82.2099C250.241 81.2191 252.552 81.8091 253.711 83.5716L256.979 88.5378C258.451 90.7752 261.503 91.3127 263.651 89.713L268.732 85.9295C270.193 84.8411 272.175 84.7698 273.711 85.7502C275.54 86.9178 277.948 86.5722 279.375 84.9373L288.939 73.9802C290.55 72.1348 293.315 71.8526 295.265 73.3347L297.392 74.9509C298.824 76.0392 300.813 76.0157 302.219 74.8938C303.532 73.846 305.366 73.7493 306.782 74.6532L307.259 74.9575C308.977 76.0544 311.21 75.906 312.768 74.5913L340.223 51.4257C342.034 49.8975 344.704 49.9731 346.426 51.6013L350.783 55.7215C352.47 57.3163 355.073 57.4257 356.887 55.978L359.541 53.8608C361.437 52.3478 364.177 52.5439 365.839 54.3115L365.936 54.4152C367.492 56.0707 370.016 56.3616 371.908 55.1036L375.141 52.9536C376.746 51.8866 378.842 51.9182 380.414 53.033L382.433 54.4646C383.822 55.4497 385.637 55.5982 387.168 54.8519L409.92 43.7577C411.345 43.0629 413.026 43.1407 414.381 43.9643L417.008 45.5613C418.888 46.7046 421.313 46.3752 422.82 44.7715L424.242 43.2586C425.319 42.1132 426.9 41.5883 428.448 41.8627L430.568 42.2386C432.004 42.4932 433.477 42.0604 434.546 41.0691L465.622 12.2746C467.239 10.7767 469.684 10.617 471.481 11.892L478.954 17.1921C480.805 18.5044 483.331 18.2927 484.937 16.6909L499.142 2.52391C500.015 1.65321 501.197 1.16424 502.43 1.16424H508.532"
                    stroke="#008A25"
                    strokeWidth="2.32849"
                  />
                </svg>
              </div>
            </div>
            </div>
          </div>

          {/* Decorative interaction cue, not a real cursor — hidden from
              assistive tech same as the rest of this card. Starts
              invisible (opacity set via motion's animate(..., {duration:
              0}) above) until the scroll trigger plays it in. */}
          <div className={styles.cursor} ref={cursorRef} aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 3L4 18.5L8 15L10.5 20.5L13 19.3L10.5 14L16 14L4 3Z"
                fill="#ffffff"
                stroke="#00203a"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
