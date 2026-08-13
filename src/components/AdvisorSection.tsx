"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import Button from "@/components/ui/Button";
import { useInView } from "@/hooks/useInView";
import styles from "./AdvisorSection.module.css";

/**
 * "Got questions about your money?" — Figma node 469:1889. Sits between
 * UsSection and GrowSection (see ServicesSection.tsx). Copied, not shared:
 * same house rule as every other section.
 *
 * Replaces the prior avatar-orbit decoration with a field of chat bubbles
 * scattered around the sky card (Figma frames 473:1915–473:1956), each
 * anchored by its own top-left corner as a percentage of the card so the
 * whole field re-scales with the card's width. Fixed pixel sizing
 * (padding/radius/font) matches the rest of the site's decorative chrome
 * (e.g. the old orbit chips) rather than scaling with the card.
 *
 * Bubbles pop in one at a time (staggered by `order`, top to bottom) once
 * the card is ~40% on screen, then settle into a slow vertical float that
 * loops forever — once played, they stay up even if the card scrolls back
 * out of view, same fire-once behavior as useInView's other consumers.
 * `side` — which half of the card a bubble sits in — drives the float's
 * own duration/delay (see .bubbleFloatLeft/Right in the stylesheet) so the
 * two sides drift out of phase rather than bobbing in lockstep.
 */
type BubbleVariant = "white" | "blue";
type BubbleAlign = "left" | "right";
type BubbleSide = "left" | "right";

type Bubble = {
  key: string;
  left: string;
  top: string;
  variant: BubbleVariant;
  align: BubbleAlign;
  side: BubbleSide;
  /** Pop-in order, top to bottom — drives the entrance stagger. */
  order: number;
  lines: string[];
};

const BUBBLES: Bubble[] = [
  {
    key: "min-invest-india",
    left: "68.31%",
    top: "2.99%",
    variant: "white",
    align: "right",
    side: "right",
    order: 0,
    lines: ["What's the minimum I need to", "start investing in India?"],
  },
  {
    key: "nre-account-1",
    left: "18.68%",
    top: "5.80%",
    variant: "blue",
    align: "left",
    side: "left",
    order: 1,
    lines: ["How do I open an NRE", "account from abroad?"],
  },
  {
    key: "sip-uae",
    left: "80.31%",
    top: "21.97%",
    variant: "blue",
    align: "right",
    side: "right",
    order: 2,
    lines: ["Can I do a SIP in rupees from", "my UAE account?"],
  },
  {
    key: "rupee-safety",
    left: "12.50%",
    top: "24.78%",
    variant: "white",
    align: "left",
    side: "left",
    order: 3,
    lines: ["Is my money safe if the", "rupee falls?"],
  },
  {
    key: "nre-account-2",
    left: "1.16%",
    top: "42.53%",
    variant: "blue",
    align: "left",
    side: "left",
    order: 4,
    lines: ["How do I open an NRE", "account from abroad?"],
  },
  {
    key: "us-stocks-uae",
    left: "73.76%",
    top: "42.88%",
    variant: "white",
    align: "right",
    side: "right",
    order: 5,
    lines: ["Can I invest in US stocks", "from the UAE?"],
  },
  {
    key: "india-or-usd",
    left: "5.09%",
    top: "63.09%",
    variant: "white",
    align: "left",
    side: "left",
    order: 6,
    lines: ["Should I invest in India or", "keep it in USD?"],
  },
  {
    key: "sip-start",
    left: "84.52%",
    top: "65.20%",
    variant: "blue",
    align: "left",
    side: "right",
    order: 7,
    lines: ["When should I start a SIP?"],
  },
  {
    key: "crore-goal",
    left: "11.70%",
    top: "82.60%",
    variant: "blue",
    align: "left",
    side: "left",
    order: 8,
    lines: ["I want ₹1 crore in 10 years.", "Where do I start?"],
  },
  {
    key: "mutual-fund-house",
    left: "78.13%",
    top: "83.99%",
    variant: "white",
    align: "right",
    side: "right",
    order: 9,
    lines: ["How can i invest in mutual fund", "to build a house in india in 5 years?"],
  },
];

/** Seconds between each bubble's pop-in. With 10 bubbles (order 0–9) and
    the 0.9s pop duration in the stylesheet, 9 * 0.4 + 0.9 = 4.5s for the
    whole cascade to finish — the "one by one" read stays legible without
    dragging past the ~4–5s the entrance is meant to take. */
const POP_STAGGER = 0.4;

export default function AdvisorSection() {
  // Fires once the card is ~40% on screen and stays fired — the cascade
  // plays once and the bubbles (and their float loop) stay up regardless
  // of scrolling back afterward.
  const [bubblesRef, bubblesInView] = useInView<HTMLDivElement>();

  return (
    <section className={styles.section}>
      {/* Full, uncropped source image (2000x1160, ~1.724:1), scaled by
          width alone (height: auto) rather than cover-cropped into a fixed
          box — its own baked-in fade from blue sky to solid white at the
          bottom shows in full this way, and blends directly into
          GrowSection's white background right after it with no separate
          gradient overlay needed to do that job. */}
      <div className={styles.frame}>
        <Image
          src="/images/advisor-sky.png"
          alt=""
          width={2000}
          height={1160}
          className={styles.bgImage}
        />

        {/* Decorative — the questions carry no information not already in
            the heading/subtext, so the whole layer is hidden from
            assistive tech rather than announced as a list of chat bubbles. */}
        <div
          ref={bubblesRef}
          aria-hidden="true"
          className={`${styles.bubbleLayer} ${bubblesInView ? styles.bubbleLayerRunning : ""}`}
        >
          {BUBBLES.map((bubble) => {
            const style = { left: bubble.left, top: bubble.top, "--pop-delay": `${bubble.order * POP_STAGGER}s` } as CSSProperties;
            return (
              <div
                key={bubble.key}
                className={`${styles.bubble} ${styles[`bubble${bubble.variant === "white" ? "White" : "Blue"}`]} ${
                  styles[`bubble${bubble.align === "left" ? "Left" : "Right"}`]
                } ${styles[`bubbleFloat${bubble.side === "left" ? "Left" : "Right"}`]}`}
                style={style}
              >
                {bubble.lines.map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      <div className={styles.content}>
        <div className={styles.avatarWrap}>
          <div className={styles.avatar}>
            <Image
              src="/images/advisor-hero-avatar.png"
              alt=""
              width={139}
              height={139}
              className={styles.avatarImg}
            />
          </div>
          {/* Crossfades between the two icons on a 4s loop (2s per icon) —
              decorative, so it's hidden from assistive tech rather than
              announced as changing content. */}
          <div className={styles.avatarBadge} aria-hidden="true">
            <Image
              src="/images/icon-video-call.svg"
              alt=""
              width={14}
              height={14}
              className={`${styles.avatarBadgeIcon} ${styles.avatarBadgeIconVideo}`}
            />
            <Image
              src="/images/icon-phone-call.svg"
              alt=""
              width={14}
              height={14}
              className={`${styles.avatarBadgeIcon} ${styles.avatarBadgeIconPhone}`}
            />
          </div>
        </div>
        <h2 className={styles.heading}>
          Got questions about
          <br />
          your money?
        </h2>
        <p className={styles.subtext}>
          Whether you&apos;re starting your investment journey or managing a growing
          portfolio, receive personalized guidance whenever you need it.
        </p>
        <Button type="button" className={styles.cta}>
          Book a Free Consultation
        </Button>
      </div>
    </section>
  );
}
