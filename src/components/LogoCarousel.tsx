"use client";

import { useEffect, useRef, type CSSProperties, type RefObject } from "react";
import gsap from "gsap";

type LogoCarouselProps = {
  /** Image URLs — min 3. */
  logos: string[];
  /** Center card size in px. */
  cardSize?: number;
  /** Distance from center to side cards, in px. */
  sideOffset?: number;
  /** Transition duration, in seconds. */
  duration?: number;
  /** Pause between transitions, in seconds. */
  holdDuration?: number;
  className?: string;
};

/**
 * Three-card carousel: a center card flanked by two half-size side cards,
 * cycling continuously — the card that exits left re-enters on the right
 * queued with the next logo, so the rotation never runs out.
 *
 * Plain <img> refs, not next/image: the timeline mutates .src imperatively
 * on tick (see the `tl.add` callback below) rather than through a React
 * re-render, which next/image's own controlled <Image> isn't built to
 * accept — this needs direct DOM control on GSAP's clock, not React's.
 */
export default function LogoCarousel({
  logos,
  cardSize = 48,
  sideOffset = 41,
  duration = 1.3,
  holdDuration = 1.0,
  className = "",
}: LogoCarouselProps) {
  const card0 = useRef<HTMLDivElement>(null);
  const card1 = useRef<HTMLDivElement>(null);
  const card2 = useRef<HTMLDivElement>(null);
  const img0 = useRef<HTMLImageElement>(null);
  const img1 = useRef<HTMLImageElement>(null);
  const img2 = useRef<HTMLImageElement>(null);

  const positions = useRef<[number, number, number]>([0, 1, 2]);
  const nextLogoCounter = useRef(3);
  const timeoutRef = useRef<number | undefined>(undefined);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;

    const cards = [card0.current!, card1.current!, card2.current!];
    const imgs = [img0.current!, img1.current!, img2.current!];
    const [lIdx, cIdx, rIdx] = positions.current;

    gsap.set(cards[lIdx], { x: -sideOffset, scale: 0.5, opacity: 0.6, zIndex: 1 });
    gsap.set(cards[cIdx], { x: 0, scale: 1, opacity: 1, zIndex: 2 });
    gsap.set(cards[rIdx], { x: sideOffset, scale: 0.5, opacity: 0.6, zIndex: 1 });

    // Static three-card layout, no rotation — matches how every other
    // motion effect on this site treats reduced motion (state still
    // updates where it must, but nothing animates continuously for its
    // own sake).
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return () => {
        alive.current = false;
      };
    }

    const animate = () => {
      if (!alive.current) return;

      const [lIdx, cIdx, rIdx] = positions.current;
      const recycledLogo = logos[nextLogoCounter.current % logos.length];

      const tl = gsap.timeline({
        onComplete: () => {
          if (!alive.current) return;
          positions.current = [cIdx, rIdx, lIdx];
          nextLogoCounter.current++;
          timeoutRef.current = window.setTimeout(animate, holdDuration * 1000);
        },
      });

      tl.to(
        cards[lIdx],
        {
          x: -sideOffset * 2.2,
          opacity: 0,
          duration: duration * 0.55,
          ease: "power3.inOut",
        },
        0,
      );

      tl.to(
        cards[cIdx],
        {
          x: -sideOffset,
          scale: 0.5,
          opacity: 0.6,
          zIndex: 1,
          duration,
          ease: "power3.inOut",
        },
        0,
      );

      tl.to(
        cards[rIdx],
        {
          x: 0,
          scale: 1,
          opacity: 1,
          zIndex: 2,
          duration,
          ease: "power3.inOut",
        },
        0,
      );

      tl.add(() => {
        if (imgs[lIdx]) imgs[lIdx].src = recycledLogo;
      }, duration * 0.55);

      tl.set(cards[lIdx], { x: sideOffset * 2.2, scale: 0.5, zIndex: 1 }, duration * 0.55);

      tl.to(
        cards[lIdx],
        {
          x: sideOffset,
          opacity: 0.6,
          duration: duration * 0.45,
          ease: "power3.out",
        },
        duration * 0.55,
      );
    };

    timeoutRef.current = window.setTimeout(animate, holdDuration * 1000);

    return () => {
      alive.current = false;
      window.clearTimeout(timeoutRef.current);
      gsap.killTweensOf(cards);
    };
    // Deliberately []: this mounts one continuously self-rescheduling loop
    // and never needs to restart it. Adding logos/cardSize/etc. as deps
    // would tear the timeline down and rebuild it — losing mid-transition
    // state — on every render where a caller passes a new array/number
    // literal, not just on a real change of pace or content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const borderRadius = cardSize / 6;
  const borderWidth = cardSize / 12;
  const outerRadius = borderRadius + borderWidth;

  const cardStyle: CSSProperties = {
    position: "absolute",
    width: cardSize,
    height: cardSize,
    willChange: "transform, opacity",
  };

  const renderCard = (
    cardRef: RefObject<HTMLDivElement | null>,
    imgRef: RefObject<HTMLImageElement | null>,
    idx: number,
    logoIdx: number,
  ) => (
    <div key={idx} ref={cardRef} style={cardStyle}>
      {/* Plain img, not next/image: the timeline mutates .src directly on
          this DOM node outside React's render cycle (see the tl.add
          callback above) — next/image's own controlled <Image> component
          has no such imperative escape hatch. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={logos[logoIdx]}
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          borderRadius,
          display: "block",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: -borderWidth,
          borderRadius: outerRadius,
          border: `${borderWidth}px solid #f5f5f5`,
          boxShadow: "0px 34px 64px 0px rgba(53,92,124,0.3)",
          pointerEvents: "none",
        }}
      />
    </div>
  );

  return (
    <div
      className={className}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // Fixed at 64px regardless of cardSize — the reference component
        // sized this as cardSize * 2, but this usage needs a set row height
        // to sit inline with GrowSection's text column. overflow: visible
        // means the side cards (which extend past this box once scaled/
        // offset) are never clipped by it.
        height: 64,
        overflow: "visible",
      }}
    >
      {renderCard(card0, img0, 0, 0)}
      {renderCard(card1, img1, 1, 1)}
      {renderCard(card2, img2, 2, 2)}
    </div>
  );
}
