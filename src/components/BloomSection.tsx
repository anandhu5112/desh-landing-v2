"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import Image from "next/image";

import Button from "@/components/ui/Button";
import styles from "./BloomSection.module.css";

/** Also used by ContactModal/GrowSection/UsSection — same four faces. */
const AVATARS = [
  "/images/join-avatar-1.png",
  "/images/join-avatar-2.png",
  "/images/join-avatar-3.png",
  "/images/join-avatar-4.png",
];

/**
 * Wealth Bloom — SIP calculator.
 *
 * The flower follows investment duration alone. Monthly investment still
 * changes the projected corpus, but it never moves the bloom. Predecoded frame
 * atlases keep slider feedback synchronous: no video seeking, buffering, or
 * decoder work occurs while the user drags.
 */

/** Lives in /public. Static export serves these straight from the origin root. */
const BLOOM_ATLASES = ["/bloom-atlas-01.webp", "/bloom-atlas-02.webp"] as const;

const ATLAS_COLUMNS = 6;
const FRAMES_PER_ATLAS = 24;
const FRAME_WIDTH = 540;
const FRAME_HEIGHT = 720;
const TOTAL_FRAMES = BLOOM_ATLASES.length * FRAMES_PER_ATLAS;

/**
 * Slider ranges. Duration also defines the ends of the bloom timeline, so
 * widening it automatically re-normalises the animation.
 */
const AMOUNT = { min: 1_000, max: 200_000, step: 1_000, initial: 25_000 } as const;
const YEARS = { min: 1, max: 30, step: 1, initial: 15 } as const;
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

/** Duration → position on the bloom timeline, 0..1. */
function bloomProgress(years: number): number {
  return Math.min(1, Math.max(0, (years - YEARS.min) / (YEARS.max - YEARS.min)));
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
  const [years, setYears] = useState<number>(YEARS.initial);
  const [bloomVisible, setBloomVisible] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const initialFrame = bloomProgress(YEARS.initial) * (TOTAL_FRAMES - 1);
  const targetRef = useRef(initialFrame);
  const headRef = useRef(initialFrame);
  const drawnFrameRef = useRef(-1);

  const ids = useId();
  const amountId = `${ids}-amount`;
  const yearsId = `${ids}-years`;

  const corpus = futureValue(monthly, ASSUMED_ANNUAL_RATE, years);

  const yearsText = `${years} ${years === 1 ? "year" : "years"}`;

  // Duration — and only duration — moves the bloom.
  useEffect(() => {
    targetRef.current = bloomProgress(years) * (TOTAL_FRAMES - 1);
  }, [years]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !context) return;

    let cancelled = false;
    let animationFrame = 0;
    let lastTime = performance.now();

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

    void Promise.all(BLOOM_ATLASES.map(loadAtlas))
      .then((atlases) => {
        if (cancelled) return;

        draw(atlases, headRef.current);
        setBloomVisible(true);

        const tick = (now: number) => {
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
          animationFrame = requestAnimationFrame(tick);
        };

        lastTime = performance.now();
        animationFrame = requestAnimationFrame(tick);
      })
      .catch(() => {
        // Keep the section usable if an atlas request is interrupted or blocked.
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <section id="wealth-bloom" className={styles.section}>
      <div className={styles.darkBox}>
        <div className={`grid ${styles.panel}`}>
          <div className={styles.header}>
            <h2 className={styles.title}>Wealth grows with time</h2>
            <p className={styles.tagline}>
              Adjust the sliders and watch your wealth grow.
            </p>
          </div>
        </div>

        <div className={`grid ${styles.panel} ${styles.calcPanel}`}>
          <div className={styles.media}>
            <canvas
              ref={canvasRef}
              className={`${styles.bloom} ${bloomVisible ? styles.bloomReady : ""}`}
              width={FRAME_WIDTH}
              height={FRAME_HEIGHT}
              aria-hidden="true"
            />
          </div>

          <div className={styles.controlsCol}>
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
              Illustrative projection at an assumed 12% annual return. Investments are
              subject to market risk; past performance does not predict future results.
            </p>
          </div>
        </div>

        <div className={`grid ${styles.panel}`}>
          <div className={styles.portfolio}>
            <h2 className={styles.portfolioHeading}>
              <span className={styles.headingLine}>Let&apos;s build your</span>
              <span className={styles.headingLine}>portfolio together</span>
            </h2>
            <p className={styles.portfolioSubtext}>
              Get expert advice when you need it, or connect with fellow investors for
              ideas, updates, and learning.
            </p>
            <Button type="button" className={styles.portfolioCta}>
              Talk to an Advisor
            </Button>
          </div>
        </div>
      </div>

      {/* Straddles .darkBox's bottom edge — in Figma the card's lower third
          hangs past the dark panel onto the page background below it. */}
      <div className={styles.whatsappRow}>
        <div className={styles.whatsappCard}>
          <div className={styles.qrWrap}>
            <Image
              src="/images/qr-code.svg"
              alt="QR code to join the Desh WhatsApp community"
              width={286}
              height={286}
              className={styles.qrImage}
            />
          </div>
          <div className={styles.whatsappTextCol}>
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
            <p className={styles.whatsappHeading}>
              Join our exclusive NRI WhatsApp community.
            </p>
            <p className={styles.whatsappSubtext}>
              Get guided, get invested, and build wealth back home from wherever you
              are in the world.
            </p>
            <Button type="button" className={styles.ctaGreen}>
              Join Our Community
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
