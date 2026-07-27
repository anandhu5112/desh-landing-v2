"use client";

import { useEffect, useRef } from "react";

/**
 * Plays only while the element is at least halfway inside the viewport, which
 * for the horizontally-scrolling panel means "once it reaches centre screen".
 * IntersectionObserver measures the post-transform box, so it tracks the
 * GSAP-driven horizontal slide correctly.
 */
export default function AutoplayVideo({
  src,
  className,
  poster,
}: {
  src: string;
  className?: string;
  poster?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Autoplay can still be rejected; the video is muted so this is
          // unlikely, but a rejected promise must not surface as an error.
          void el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      className={className}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="metadata"
    />
  );
}
