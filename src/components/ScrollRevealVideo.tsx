"use client";

import { useEffect, useRef, useState } from "react";
import { getScroller } from "@/lib/scroller";

/** Fire as soon as any pixel of the clip enters the scrollport. Waiting for
 *  30% left the poster up while the section was already clearly on screen —
 *  the lag the dollar illustration was showing on cold phone loads. */
export const PLAY_OBSERVER_OPTIONS: IntersectionObserverInit = { threshold: 0 };

/**
 * Start fetching the clip once it is within ~2.5 scrollports of the screen.
 *
 * Must clear the hero sticky range (~186% of the scroller — see
 * `HERO_PIN_EXTRA_PCT` in Hero.tsx) plus ServicesSection's rise offset
 * (120px). A 150% margin left the dollar clip just past the warm zone at
 * scrollTop=0, so the 600KB file only started mid-hero and was still
 * buffering when the section arrived. 250% warms it on/near first paint
 * without also pulling the further-down rupee clip.
 *
 * `root` is set at observe-time to `#page-scroller` (see `observerRoot()`):
 * a viewport root makes this margin a no-op under the nested overflow clip.
 */
export const WARM_OBSERVER_OPTIONS: IntersectionObserverInit = {
  rootMargin: "250% 0px",
  threshold: 0,
};

/** The page scrolls in `#page-scroller`, not the window. Observing against
 *  the viewport (IO's default) clips targets to the scrollport *before*
 *  `rootMargin` is applied, so a 150% warm margin never fires early — the
 *  mp4 only starts downloading once the section is already on screen, which
 *  is the cold-mobile "poster holds, bloom starts late" lag. Same root as
 *  `useSnapIntoView`. */
export function observerRoot(): Element | null {
  return getScroller();
}

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
 *
 * Cold mobile loads also refuse to wait on a multi-megabyte `preload="auto"`
 * race against the hero. The clip's `src` stays unset (and a lightweight
 * `poster` holds the first frame) until the warm observer says the section
 * is approaching; only then does the browser start the download.
 */
export default function ScrollRevealVideo({
  src,
  poster,
  className,
}: {
  src: string;
  poster?: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [activeSrc, setActiveSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    const video = ref.current;
    if (!video || activeSrc === src) return;

    const warm = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setActiveSrc(src);
      warm.disconnect();
    }, { ...WARM_OBSERVER_OPTIONS, root: observerRoot() });
    warm.observe(video);
    return () => warm.disconnect();
  }, [src, activeSrc]);

  useEffect(() => {
    const video = ref.current;
    if (!video || !activeSrc) return;

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
    }, { ...PLAY_OBSERVER_OPTIONS, root: observerRoot() });
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
  }, [activeSrc]);

  return (
    <video
      ref={ref}
      className={className}
      muted
      playsInline
      preload={activeSrc ? "auto" : "none"}
      poster={poster}
      src={activeSrc}
      aria-hidden="true"
    />
  );
}
