"use client";

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import Image from "next/image";

import Button from "@/components/ui/Button";
import { COMMUNITY_URL } from "@/lib/contact";
import { getScroller } from "@/lib/scroller";
import styles from "./BloomSection.module.css";

/** Also used by ContactModal/GrowSection/UsSection — same four faces.
 *
 * The .webp variants, not the source PNGs: these render as 30px circles, and
 * the originals are full-size portraits up to 927px and 1.2MB apiece — 2.1MB
 * of downloads between them to fill 120px of screen. Resized to 90px (3x,
 * for the densest phone screens) the four together come to 11KB. No PNG
 * fallback here, unlike the hero: these are decorative faces, and a browser
 * too old for WebP showing four gaps is a better trade than every modern
 * visitor paying 2.1MB. Regenerate with `npm run optimize:images`. */
const AVATARS = [
  "/images/join-avatar-1.webp",
  "/images/join-avatar-2.webp",
  "/images/join-avatar-3.webp",
  "/images/join-avatar-4.webp",
];

/**
 * Wealth Bloom — SIP calculator.
 *
 * Both controls drive the bloom — monthly investment (a slider) and
 * investment duration (a fixed set of preset buttons, Figma node 501:7690,
 * not a slider) each contribute half of the bloom's progress, so moving
 * either one visibly moves the flower. Predecoded frame atlases keep
 * slider feedback synchronous: no video seeking, buffering, or decoder
 * work occurs while the user drags.
 */

/** Lives in /public. Static export serves these straight from the origin root. */
const BLOOM_ATLASES = ["/bloom-atlas-01.webp", "/bloom-atlas-02.webp"] as const;

/** Single frame (the bloom's initial state), heavily compressed — shown in
 *  place of the canvas until the two atlases (~750KB combined) have loaded.
 *  Regenerate with `node -e` per the atlas frame math in this file if the
 *  initial amount/duration defaults ever change. */
const BLOOM_POSTER = "/bloom-poster.webp";

/** The calculator sits well below the hero. Loading ~750KB of atlases on
 *  every visit, regardless of whether anyone scrolls that far, was the
 *  actual cost being cut here — so the atlases are requested only once the
 *  calculator is within this margin of the scrollport, same technique as
 *  ScrollRevealVideo's warm observer. `root` is set at observe-time to
 *  `#page-scroller`: the page scrolls inside that div, not the window, so a
 *  viewport root would clip the target before rootMargin ever applied. */
const WARM_OBSERVER_OPTIONS: IntersectionObserverInit = {
  rootMargin: "120% 0px",
  threshold: 0,
};

/** Once loaded, pause the rAF loop while the calculator is off-screen and
 *  resume it (if the bloom hasn't already settled on its target frame) when
 *  it scrolls back in. */
const VISIBILITY_OBSERVER_OPTIONS: IntersectionObserverInit = { threshold: 0 };

const ATLAS_COLUMNS = 6;
const FRAMES_PER_ATLAS = 24;
const FRAME_WIDTH = 540;
const FRAME_HEIGHT = 720;
const TOTAL_FRAMES = BLOOM_ATLASES.length * FRAMES_PER_ATLAS;

/**
 * Slider range. Also defines the ends of the bloom timeline, so widening it
 * automatically re-normalises the animation.
 */
const AMOUNT = { min: 1_000, max: 200_000, step: 1_000, initial: 1_000 } as const;

/** Investment Duration is a fixed set of preset buttons, not a slider (Figma
    node 501:7690) — the last one reads "30 yrs". */
const YEARS_PRESETS = [5, 10, 15, 20, 25, 30] as const;
const YEARS_INITIAL: (typeof YEARS_PRESETS)[number] = YEARS_PRESETS[0];

const ASSUMED_ANNUAL_RATE = 12;

/**
 * Future value of a SIP due — contributions at the start of each month.
 *   FV = P · [((1 + i)^n − 1) / i] · (1 + i)
 */
function futureValue(monthly: number, annualRate: number, years: number): number {
  const i = annualRate / 100 / 12;
  const n = years * 12;
  if (i === 0) return monthly * n;
  return monthly * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
}

/** Monthly investment → 0..1. */
function monthlyFraction(monthly: number): number {
  return Math.min(1, Math.max(0, (monthly - AMOUNT.min) / (AMOUNT.max - AMOUNT.min)));
}

/** Selected duration preset → 0..1, by its index among YEARS_PRESETS rather
    than its raw year value — an evenly-spaced step per button regardless of
    how the preset values themselves are spaced. */
function yearsFraction(years: number): number {
  const index = YEARS_PRESETS.indexOf(years as (typeof YEARS_PRESETS)[number]);
  return Math.max(0, index) / (YEARS_PRESETS.length - 1);
}

/** Both controls drive the bloom, half each — moving either one visibly
    moves the flower. */
function bloomProgress(monthly: number, years: number): number {
  return (monthlyFraction(monthly) + yearsFraction(years)) / 2;
}

/** Responsive follow with a one-frame cap so large jumps still show every stage. */
const FOLLOW_TIME_MS = 70;
const MAX_FRAMES_PER_SECOND = 60;
const SETTLE_FRAME = 0.01;

/**
 * Indian digit grouping, hand-rolled rather than Intl.
 *
 * The section prerenders at build time and hydrates in the browser. A Node
 * build without full ICU groups differently from the browser, which shows up
 * as a hydration mismatch on the largest number on the page. This cannot.
 */
function inr(value: number): string {
  const digits = Math.round(value).toString();
  const head = digits.slice(0, -3);
  const tail = digits.slice(-3);
  if (!head) return `₹${tail}`;
  return `₹${head.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${tail}`;
}

function compact(value: number): string {
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(2)} Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(2)} L`;
  if (value >= 1e3) return `₹${(value / 1e3).toFixed(1)} K`;
  return "";
}

/** Diameter of the silver rupee coin slider thumb (px). */
const THUMB_SIZE = 40;

/* ── Memoised blocks ──────────────────────────────────────────────────────
   Everything below is independent of the slider. Dragging used to re-render
   the whole section — the QR image, the four avatars, the portfolio CTA —
   on every input event, measured at 2.4ms median and 14.9ms worst case in
   dev. Splitting them out means a drag reconciles only the controls and the
   readout. */

const BloomHeader = memo(function BloomHeader() {
  return (
    <div className={`grid ${styles.panel}`}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          <span className={styles.dropCap}>W</span>ealth grows with time
        </h2>
        <p className={styles.tagline}>
          Adjust the sliders and watch your wealth grow.
        </p>
      </div>
    </div>
  );
});

const DurationPresets = memo(function DurationPresets({
  years,
  labelledBy,
  onSelect,
}: {
  years: number;
  labelledBy: string;
  onSelect: (preset: number) => void;
}) {
  return (
    <div className={styles.durationGroup} role="radiogroup" aria-labelledby={labelledBy}>
      {YEARS_PRESETS.map((preset) => {
        const label = `${preset} yrs`;
        const isActive = years === preset;
        return (
          <button
            key={preset}
            type="button"
            role="radio"
            aria-checked={isActive}
            className={`${styles.durationButton} ${isActive ? styles.durationButtonActive : ""}`}
            onClick={() => onSelect(preset)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
});

const PortfolioBlock = memo(function PortfolioBlock() {
  return (
    <div className={`grid ${styles.panel}`}>
      <div className={styles.portfolio}>
        <h2 className={styles.portfolioHeading}>
          <span className={styles.headingLine}>
            <span className={styles.dropCap}>I</span>nvest like a true
          </span>
          <span className={styles.headingLine}>global citizen</span>
        </h2>
        <p className={styles.portfolioSubtext}>
          Talk through your goals with an advisor and plan your next investment with
          clarity.
        </p>
      </div>
    </div>
  );
});

/* Straddles .darkBox's bottom edge — in Figma the card's lower third
   hangs past the dark panel onto the page background below it. Also the
   id target for SiteNav's "Community" link (#community). */
const WhatsappRow = memo(function WhatsappRow() {
  return (
    <div id="community" className={styles.whatsappRow}>
      <div className={styles.whatsappCard}>
        <div className={styles.whatsappTextCol}>
          <div className={styles.communityEyebrow}>
            <span className={styles.communityDot} aria-hidden="true" />
            THE DESH COMMUNITY
          </div>
          <h2 className={styles.whatsappHeading}>
            A little closer<br />to home.
          </h2>
          <p className={styles.whatsappSubtext}>
            Meet fellow NRIs, ask your questions, and find your footing investing back home.
          </p>
          <div className={styles.communityPeople}>
            <div className={styles.avatarStack}>
              {AVATARS.map((src) => (
                <Image
                  key={src}
                  src={src}
                  alt=""
                  width={30}
                  height={30}
                  className={styles.avatarImg}
                />
              ))}
            </div>
            <span className={styles.communityCaption}>Across borders. On WhatsApp.</span>
          </div>
          <Button
            href={COMMUNITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.ctaGreen}
          >
            Join community <span aria-hidden="true">↗</span>
          </Button>
        </div>
        <div className={styles.qrPanel}>
          <div className={styles.qrWrap}>
            <Image
              src="/images/qr-code.svg"
              alt="QR code to join the Desh WhatsApp community"
              width={164}
              height={164}
              className={styles.qrImage}
            />
          </div>
          <p className={styles.qrLabel}>Your people, one scan away.</p>
          <p className={styles.qrHint}>Scan with your phone camera</p>
        </div>
      </div>
    </div>
  );
});

export default function BloomSection() {
  const [monthly, setMonthly] = useState<number>(AMOUNT.initial);
  const [amountDraft, setAmountDraft] = useState<string | null>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const [years, setYears] = useState<number>(YEARS_INITIAL);
  const [bloomVisible, setBloomVisible] = useState(false);
  const [atlasesRequested, setAtlasesRequested] = useState(false);
  const [posterFailed, setPosterFailed] = useState(false);

  const mediaRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const initialFrame = bloomProgress(AMOUNT.initial, YEARS_INITIAL) * (TOTAL_FRAMES - 1);
  const targetRef = useRef(initialFrame);
  const headRef = useRef(initialFrame);
  const drawnFrameRef = useRef(-1);
  const inViewRef = useRef(false);
  const loopRunningRef = useRef(false);
  /** Set once the atlases have loaded; lets the [monthly, years] effect below
   *  (which fires before the atlas-loading effect if both change together)
   *  kick a stalled loop back to life without the two effects needing to
   *  share more than a ref. */
  const ensureAnimatingRef = useRef<() => void>(() => {});

  const ids = useId();
  const amountId = `${ids}-amount`;
  const yearsLabelId = `${ids}-years-label`;

  const corpus = futureValue(monthly, ASSUMED_ANNUAL_RATE, years);
  const amountRatio = monthlyFraction(monthly);
  const amountPct = amountRatio * 100;
  const amountOffset = (0.5 - amountRatio) * THUMB_SIZE;
  const sliderPosition = `calc(${amountPct}% + ${amountOffset}px)`;

  // Both monthly investment and investment duration move the bloom. This
  // runs whether or not the atlases have loaded yet — headRef simply starts
  // its first animated step from wherever targetRef already points once
  // loading finishes — but if the loop had already settled and gone idle,
  // wake it back up so the new target actually gets drawn.
  useEffect(() => {
    targetRef.current = bloomProgress(monthly, years) * (TOTAL_FRAMES - 1);
    ensureAnimatingRef.current();
  }, [monthly, years]);

  // Begin loading the atlases only once the calculator is within reach of
  // the scrollport, using the actual scroller as the observer root (see
  // WARM_OBSERVER_OPTIONS above) — not on mount, which was paying for ~750KB
  // of decode on every visit regardless of whether anyone scrolled this far.
  useEffect(() => {
    const node = mediaRef.current;
    if (!node || atlasesRequested) return;

    const warm = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setAtlasesRequested(true);
      warm.disconnect();
    }, { ...WARM_OBSERVER_OPTIONS, root: getScroller() });
    warm.observe(node);
    return () => warm.disconnect();
  }, [atlasesRequested]);

  useEffect(() => {
    if (!atlasesRequested) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !context) return;

    let cancelled = false;
    let animationFrame = 0;
    let lastTime = performance.now();
    let visibility: IntersectionObserver | null = null;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const draw = (atlases: HTMLImageElement[], frame: number) => {
      const frameIndex = Math.min(TOTAL_FRAMES - 1, Math.max(0, Math.round(frame)));
      if (drawnFrameRef.current === frameIndex) return;

      const atlasIndex = Math.floor(frameIndex / FRAMES_PER_ATLAS);
      const localFrame = frameIndex % FRAMES_PER_ATLAS;
      const sourceX = (localFrame % ATLAS_COLUMNS) * FRAME_WIDTH;
      const sourceY = Math.floor(localFrame / ATLAS_COLUMNS) * FRAME_HEIGHT;

      context.drawImage(
        atlases[atlasIndex],
        sourceX,
        sourceY,
        FRAME_WIDTH,
        FRAME_HEIGHT,
        0,
        0,
        FRAME_WIDTH,
        FRAME_HEIGHT,
      );
      drawnFrameRef.current = frameIndex;
    };

    const loadAtlas = async (source: string) => {
      // window.Image, not the bare global — next/image's `Image` is imported
      // into this module and shadows the DOM constructor.
      const image = new window.Image();
      image.decoding = "async";
      image.src = source;
      await image.decode();
      return image;
    };

    // Settled: reduced motion always is (it snaps straight to target), and
    // otherwise once the eased follow has closed to within SETTLE_FRAME.
    // Kept as a query against the *current* refs rather than a stored flag
    // so a target change is picked up correctly whenever it happens.
    const isSettled = () =>
      reducedMotion.matches || Math.abs(targetRef.current - headRef.current) < SETTLE_FRAME;

    void Promise.all(BLOOM_ATLASES.map(loadAtlas))
      .then((atlases) => {
        if (cancelled) return;

        draw(atlases, headRef.current);
        setBloomVisible(true);

        const step = (now: number) => {
          const elapsed = Math.min(64, now - lastTime);
          lastTime = now;
          const delta = targetRef.current - headRef.current;

          if (reducedMotion.matches || Math.abs(delta) < SETTLE_FRAME) {
            headRef.current = targetRef.current;
          } else {
            const easedStep = delta * (1 - Math.exp(-elapsed / FOLLOW_TIME_MS));
            const maxStep = (elapsed / 1_000) * MAX_FRAMES_PER_SECOND;
            headRef.current += Math.max(-maxStep, Math.min(maxStep, easedStep));
          }

          draw(atlases, headRef.current);
        };

        const tick = (now: number) => {
          step(now);
          // Stop scheduling once the animation has caught up to its target,
          // or the calculator has scrolled out of view — resumed by
          // ensureAnimating below rather than a loop spinning idle forever.
          if (isSettled() || !inViewRef.current) {
            loopRunningRef.current = false;
            return;
          }
          animationFrame = requestAnimationFrame(tick);
        };

        const ensureAnimating = () => {
          if (cancelled || loopRunningRef.current || !inViewRef.current) return;
          if (isSettled()) {
            // Target moved by less than a frame, or reduced motion — draw
            // the (possibly new) settled frame once, no loop needed.
            step(performance.now());
            return;
          }
          loopRunningRef.current = true;
          lastTime = performance.now();
          animationFrame = requestAnimationFrame(tick);
        };
        ensureAnimatingRef.current = ensureAnimating;

        visibility = new IntersectionObserver(([entry]) => {
          inViewRef.current = entry.isIntersecting;
          if (entry.isIntersecting) ensureAnimating();
        }, { ...VISIBILITY_OBSERVER_OPTIONS, root: getScroller() });
        visibility.observe(canvas);
      })
      .catch(() => {
        // Keep the section usable if an atlas request is interrupted or blocked.
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
      loopRunningRef.current = false;
      ensureAnimatingRef.current = () => {};
      visibility?.disconnect();
    };
  }, [atlasesRequested]);

  const commitAmount = () => {
    const parsed = Number((amountDraft ?? "").replace(/[₹,\s]/g, ""));
    if (amountDraft?.trim() && Number.isFinite(parsed)) {
      setMonthly(Math.min(AMOUNT.max, Math.max(AMOUNT.min,
        Math.round(parsed / AMOUNT.step) * AMOUNT.step)));
    }
    setAmountDraft(null);
  };

  const selectYears = useCallback((preset: number) => setYears(preset), []);

  return (
    <section id="wealth-bloom" className={styles.section}>
      <div className={styles.darkBox}>
        <BloomHeader />

        <div className={`grid ${styles.panel} ${styles.calcPanel}`}>
          <div className={styles.media} ref={mediaRef}>
            <div className={styles.bloomStack}>
              {/* Frame 0 of the timeline, ~7KB — holds the calculator's
                  shape on screen while the ~750KB atlas pair still loads. */}
              {!posterFailed && (
                <Image
                  src={BLOOM_POSTER}
                  alt=""
                  width={FRAME_WIDTH}
                  height={FRAME_HEIGHT}
                  className={`${styles.bloom} ${bloomVisible ? "" : styles.bloomReady}`}
                  aria-hidden="true"
                  priority
                  onError={() => setPosterFailed(true)}
                />
              )}
              <canvas
                ref={canvasRef}
                className={`${styles.bloom} ${bloomVisible ? styles.bloomReady : ""}`}
                width={FRAME_WIDTH}
                height={FRAME_HEIGHT}
                aria-hidden="true"
              />
            </div>
          </div>

          <div className={styles.controlsCol}>
          <div className={styles.controls}>
            <div className={styles.control}>
              <div className={styles.controlHead}>
                <label className={styles.controlLabel} htmlFor={`${amountId}-edit`}>
                  Monthly investment
                </label>
                <div className={styles.amountRow}>
                  <input
                    ref={amountInputRef}
                    id={`${amountId}-edit`}
                    className={styles.controlValue}
                    type="text"
                    inputMode="numeric"
                    value={amountDraft ?? inr(monthly)}
                    onFocus={(event) => {
                      setAmountDraft(String(monthly));
                      event.currentTarget.select();
                    }}
                    onChange={(event) => setAmountDraft(event.target.value)}
                    onBlur={commitAmount}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                      if (event.key === "Escape") setAmountDraft(null);
                    }}
                  />
                  <button type="button" className={styles.editAmount}
                    aria-label="Edit monthly investment"
                    onClick={() => amountInputRef.current?.focus()}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <path d="m16 3 5 5M3 21l5-1L21 7a2.1 2.1 0 0 0-5-5L3 15z" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className={styles.sliderWrap}>
                <div className={styles.sliderTrack} aria-hidden="true">
                  <div
                    className={styles.sliderFill}
                    style={{ width: sliderPosition }}
                  />
                </div>
                <input
                  id={amountId}
                  className={styles.sliderInput}
                  type="range"
                  min={AMOUNT.min}
                  max={AMOUNT.max}
                  step={AMOUNT.step}
                  value={monthly}
                  onChange={(event) => setMonthly(Number(event.target.value))}
                  aria-label="Monthly investment amount in rupees"
                  aria-valuetext={`${inr(monthly)} per month`}
                />
                <div
                  className={styles.sliderThumb}
                  style={{ left: sliderPosition }}
                  aria-hidden="true"
                >
                  <Image
                    src="/images/slider-coin.webp"
                    alt=""
                    width={40}
                    height={40}
                    className={styles.coinImg}
                    draggable={false}
                    priority
                  />
                </div>
              </div>
              <div className={styles.sliderLimits} aria-hidden="true">
                <span>{inr(AMOUNT.min)}</span><span>{inr(AMOUNT.max)}</span>
              </div>
            </div>

            <div className={styles.durationControl}>
              <p id={yearsLabelId} className={styles.controlLabel}>
                Investment duration
              </p>
              <DurationPresets
                years={years}
                labelledBy={yearsLabelId}
                onSelect={selectYears}
              />
            </div>
          </div>

          <div className={styles.readout}>
            <div>
              <p className={styles.finalLabel}>Estimated value in {years} years</p>
              <p className={styles.finalValue}>{compact(corpus)}</p>
              <p className={styles.finalCompact}>{inr(corpus)}</p>
            </div>
            <div className={styles.returnAssumption}>
              <span>Assumed annual return</span><span>{ASSUMED_ANNUAL_RATE}%</span>
            </div>
          </div>

            <p className={styles.note}>
              Illustrative projection. Investments are subject to market risk;
              past performance does not predict future results.
            </p>
          </div>
        </div>

        <PortfolioBlock />
      </div>

      <WhatsappRow />
    </section>
  );
}
