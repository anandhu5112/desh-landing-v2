"use client";

import { useEffect } from "react";
import { useInView } from "@/hooks/useInView";

/**
 * Plays once, muted, the moment it scrolls into view — no `loop`, so once
 * the clip reaches its last frame it simply holds there instead of
 * restarting. Distinct from AutoplayVideo (loops, replays on re-entry) and
 * from BloomSection's video (scrubbed by slider input, not scroll) — this
 * is a one-shot scroll-triggered reveal.
 */
export default function ScrollRevealVideo({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const [videoRef, inView] = useInView<HTMLVideoElement>();

  useEffect(() => {
    if (!inView) return;
    void videoRef.current?.play().catch(() => {});
  }, [inView, videoRef]);

  return (
    <video
      ref={videoRef}
      className={className}
      src={src}
      muted
      playsInline
      preload="auto"
      aria-hidden="true"
    />
  );
}
