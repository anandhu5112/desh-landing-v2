"use client";

import { useEffect, useRef } from "react";

/** Fires as soon as a third of the clip is on screen — near enough to
    the old "it's clearly visible now" point that nothing reads differently. */
const OBSERVER_OPTIONS: IntersectionObserverInit = { threshold: 0.3 };

/** Events after which a previously refused `play()` is worth retrying:
    the clip finally has data, or the tab came back to the foreground. */
const MEDIA_RETRY_EVENTS = ["loadeddata", "canplay", "canplaythrough"] as const;

/** Last resort — the first real user gesture anywhere on the page lifts
    every autoplay restriction there is. */
const GESTURE_RETRY_EVENTS = ["pointerdown", "touchstart", "keydown"] as const;

/**
 * Plays once, muted, the moment it scrolls into view — no `loop`, so once
 * the clip reaches its last frame it simply holds there instead of
 * restarting. Distinct from AutoplayVideo (loops, replays on re-entry) and
 * from BloomSection's video (scrubbed by slider input, not scroll) — this
 * is a one-shot scroll-triggered reveal.
 *
 * Safari is why this is more than a single fire-and-forget `play()`. WebKit
 * refuses (or silently drops) an autoplay attempt made before the clip has
 * data, and refuses outright in Low Power Mode — so one attempt whose
 * rejection is swallowed leaves the first frame frozen on screen for the
 * rest of the visit, which is exactly what the US dollar clip was doing.
 * Instead: assert `muted` on the element itself, keep the observer
 * connected, and retry on every event that could plausibly have unblocked
 * playback, until the clip has actually run to `ended`.
 */
export default function ScrollRevealVideo({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    // React assigns `muted` as a property, after it has already set `src`.
    // WebKit decides autoplay eligibility off the element's own muted
    // state, so assert it here rather than trusting the attribute alone.
    video.muted = true;

    let inView = false;
    let detached = false;
    const teardown: Array<() => void> = [];

    const detach = () => {
      if (detached) return;
      detached = true;
      teardown.forEach((fn) => fn());
    };

    const attempt = () => {
      if (detached || !inView || !video.paused) return;
      void video.play().catch(() => {});
    };

    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      attempt();
    }, OBSERVER_OPTIONS);
    observer.observe(video);
    teardown.push(() => observer.disconnect());

    // The clip has run its course — stop listening. Nothing re-arms this,
    // which is what keeps the one-shot behaviour: scrolling away and back
    // holds the last frame instead of replaying.
    video.addEventListener("ended", detach);
    teardown.push(() => video.removeEventListener("ended", detach));

    for (const event of MEDIA_RETRY_EVENTS) {
      video.addEventListener(event, attempt);
      teardown.push(() => video.removeEventListener(event, attempt));
    }

    for (const event of GESTURE_RETRY_EVENTS) {
      window.addEventListener(event, attempt, { passive: true });
      teardown.push(() => window.removeEventListener(event, attempt));
    }

    document.addEventListener("visibilitychange", attempt);
    teardown.push(() => document.removeEventListener("visibilitychange", attempt));

    return detach;
  }, [src]);

  return (
    <video
      ref={ref}
      className={className}
      muted
      playsInline
      preload="auto"
      src={src}
      aria-hidden="true"
    />
  );
}
