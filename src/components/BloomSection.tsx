"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";

import styles from "./BloomSection.module.css";

/**
 * Wealth Bloom — SIP calculator.
 *
 * The flower is not decoration and it never reacts to an individual slider.
 * All three inputs collapse into one projected corpus, and that single number
 * is the playhead position on one continuous bloom timeline. The video is
 * scrubbed, never played: it passes through every intermediate frame in
 * whichever direction wealth moved, so it can neither replay nor restart.
 */

/** Lives in /public. Static export serves it straight from the origin root. */
const BLOOM_SRC = "/bloom.mp4";

/**
 * Slider ranges. The corpus bounds below are derived from these, so widening
 * a slider automatically re-normalises the bloom — never hand-tune both.
 */
const AMOUNT = { min: 1_000, max: 200_000, step: 1_000, initial: 25_000 } as const;
const RATE = { min: 6, max: 15, step: 0.5, initial: 12 } as const;
const YEARS = { min: 1, max: 30, step: 1, initial: 15 } as const;

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

const CORPUS_MIN = futureValue(AMOUNT.min, RATE.min, YEARS.min);
const CORPUS_MAX = futureValue(AMOUNT.max, RATE.max, YEARS.max);
const LOG_MIN = Math.log(CORPUS_MIN);
const LOG_SPAN = Math.log(CORPUS_MAX) - LOG_MIN;

/** Gentle ease-out. 1 is linear; 3 saturates the timeline far too early. */
const EASE_EXP = 1.45;

/**
 * Corpus → position on the bloom timeline, 0..1.
 *
 * Normalising linearly would pin every realistic SIP at effectively zero next
 * to the ₹2,00,000 × 15% × 30yr ceiling, so the corpus is normalised on a log
 * scale first. The ease-out on top lets small amounts bloom visibly straight
 * away while large ones keep maturing instead of hitting full bloom early.
 */
function bloomProgress(corpus: number): number {
  const t = Math.min(1, Math.max(0, (Math.log(corpus) - LOG_MIN) / LOG_SPAN));
  return 1 - Math.pow(1 - t, EASE_EXP);
}

/** How far the playhead closes on its target each frame — botanical, unhurried. */
const EASE_PER_FRAME = 0.075;
/** Below this the playhead snaps, so it stops chasing an asymptote forever. */
const SETTLE = 0.0004;
/** Finer than one frame at 24fps, so no visible stage is ever skipped. */
const SEEK_EPSILON = 0.01;
/** Keeps the playhead inside the last frame instead of falling off the end. */
const TAIL_GUARD = 0.04;

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
  if (value >= 1e7) return `≈ ₹${(value / 1e7).toFixed(2)} Cr`;
  if (value >= 1e5) return `≈ ₹${(value / 1e5).toFixed(2)} L`;
  if (value >= 1e3) return `≈ ₹${(value / 1e3).toFixed(1)} K`;
  return "";
}

/** Track fill is a CSS custom property, so it has to go through a cast. */
function fillStyle(value: number, min: number, max: number): CSSProperties {
  const pct = ((value - min) / (max - min)) * 100;
  return { "--fill": `${pct}%` } as CSSProperties;
}

export default function BloomSection() {
  const [monthly, setMonthly] = useState<number>(AMOUNT.initial);
  const [rate, setRate] = useState<number>(RATE.initial);
  const [years, setYears] = useState<number>(YEARS.initial);
  const [bloomVisible, setBloomVisible] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const targetRef = useRef(0);
  /** null until the first corpus lands, so the section opens on the right stage. */
  const headRef = useRef<number | null>(null);

  const ids = useId();
  const amountId = `${ids}-amount`;
  const rateId = `${ids}-rate`;
  const yearsId = `${ids}-years`;

  const corpus = futureValue(monthly, rate, years);

  const rateText = `${rate % 1 === 0 ? rate.toFixed(0) : rate.toFixed(1)}%`;
  const yearsText = `${years} ${years === 1 ? "year" : "years"}`;

  // Wealth — and only wealth — moves the bloom.
  useEffect(() => {
    const next = bloomProgress(corpus);
    targetRef.current = next;
    // Open already at the implied stage rather than animating in from a bud.
    if (headRef.current === null) headRef.current = next;
  }, [corpus]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // React does not reliably reflect the muted attribute onto the property.
    video.muted = true;

    // The <video> is server-rendered, so the browser may finish loading before
    // React hydrates and attaches onLoadedData — on a warm cache that is the
    // normal case. Missing that one event would leave the bloom at opacity 0
    // forever, invisible against the black field. Catch it here instead of
    // trusting the event alone. HAVE_CURRENT_DATA (2) means a frame exists.
    if (video.readyState >= 2) setBloomVisible(true);

    let frame = requestAnimationFrame(function tick() {
      frame = requestAnimationFrame(tick);

      // readyState < 1 means no metadata yet, so duration is NaN and seeking throws.
      if (video.readyState < 1 || headRef.current === null) return;

      const delta = targetRef.current - headRef.current;
      headRef.current =
        Math.abs(delta) < SETTLE
          ? targetRef.current
          : headRef.current + delta * EASE_PER_FRAME;

      const time = Math.max(0, headRef.current * (video.duration - TAIL_GUARD));

      // Without the seeking guard, requests pile up and the scrub turns to mush.
      if (!video.seeking && Math.abs(video.currentTime - time) > SEEK_EPSILON) {
        video.currentTime = time;
      }
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Some iOS builds refuse to decode a frame until the element has played
    // once. Nudge it on the first interaction, then pause immediately — the
    // timeline stays fully scrubbed either way.
    let nudged = false;
    const nudge = () => {
      if (nudged) return;
      nudged = true;
      void video
        .play()
        .then(() => video.pause())
        .catch(() => {});
    };

    const events = ["pointerdown", "touchstart", "keydown"] as const;
    events.forEach((event) => window.addEventListener(event, nudge, { passive: true }));
    return () => events.forEach((event) => window.removeEventListener(event, nudge));
  }, []);

  return (
    <section className={styles.section}>
      {/* Outside the grid on purpose — the bloom is full-bleed, not a column. */}
      <div className={styles.stage}>
        <video
          ref={videoRef}
          className={`${styles.bloom} ${bloomVisible ? styles.bloomReady : ""}`}
          src={BLOOM_SRC}
          muted
          playsInline
          preload="auto"
          disablePictureInPicture
          aria-hidden="true"
          onLoadedData={() => setBloomVisible(true)}
        />
      </div>

      <div className="grid">
        <div className={styles.content}>
          <h2 className={styles.title}>
            Time creates wealth. <em>Not simply money.</em>
          </h2>

          <div className={styles.controls}>
            <div className={styles.control}>
              <div className={styles.controlHead}>
                <label className={styles.controlLabel} htmlFor={amountId}>
                  Monthly Investment
                </label>
                <span className={styles.controlValue}>{inr(monthly)}</span>
              </div>
              <input
                id={amountId}
                className={styles.slider}
                type="range"
                min={AMOUNT.min}
                max={AMOUNT.max}
                step={AMOUNT.step}
                value={monthly}
                onChange={(event) => setMonthly(Number(event.target.value))}
                style={fillStyle(monthly, AMOUNT.min, AMOUNT.max)}
                aria-label="Monthly investment amount in rupees"
                aria-valuetext={`${inr(monthly)} per month`}
              />
            </div>

            <div className={styles.control}>
              <div className={styles.controlHead}>
                <label className={styles.controlLabel} htmlFor={rateId}>
                  Expected Annual Return
                </label>
                <span className={styles.controlValue}>{rateText}</span>
              </div>
              <input
                id={rateId}
                className={styles.slider}
                type="range"
                min={RATE.min}
                max={RATE.max}
                step={RATE.step}
                value={rate}
                onChange={(event) => setRate(Number(event.target.value))}
                style={fillStyle(rate, RATE.min, RATE.max)}
                aria-label="Expected annual return percentage"
                aria-valuetext={`${rateText} per year`}
              />
            </div>

            <div className={styles.control}>
              <div className={styles.controlHead}>
                <label className={styles.controlLabel} htmlFor={yearsId}>
                  Investment Duration
                </label>
                <span className={styles.controlValue}>{yearsText}</span>
              </div>
              <input
                id={yearsId}
                className={styles.slider}
                type="range"
                min={YEARS.min}
                max={YEARS.max}
                step={YEARS.step}
                value={years}
                onChange={(event) => setYears(Number(event.target.value))}
                style={fillStyle(years, YEARS.min, YEARS.max)}
                aria-label="Investment duration in years"
                aria-valuetext={yearsText}
              />
            </div>
          </div>

          {/* Plain div, not <dl>: with the breakdown rows gone there are no
              term/description pairs left to describe. */}
          <div className={styles.readout}>
            <div className={styles.final}>
              <div>
                <p className={styles.finalLabel}>Final Wealth</p>
                <p className={styles.finalValue}>{inr(corpus)}</p>
              </div>
              <span className={styles.finalCompact}>{compact(corpus)}</span>
            </div>
          </div>

          <p className={styles.note}>
            Illustrative projection at the assumed rate of return. Investments are
            subject to market risk; past performance does not predict future results.
          </p>
        </div>
      </div>
    </section>
  );
}
