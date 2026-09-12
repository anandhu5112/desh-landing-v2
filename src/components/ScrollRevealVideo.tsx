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
    the clip finally has data, or it ran dry mid-buffer. */
const MEDIA_RETRY_EVENTS = [
  "loadedmetadata",
  "loadeddata",
  "canplay",
  "canplaythrough",
  "stalled",
  "suspend",
] as const;

/**
 * Last resort — the first real user gesture anywhere on the page lifts every
 * autoplay restriction there is.
 *
 * `wheel` and `scroll` are in here because the pointer/touch/key set alone
 * does not cover how most people actually reach this section. A desktop
 * visitor trackpad- or wheel-scrolls down, reads it and leaves without ever
 * producing a pointerdown, a touchstart or a keydown; on iOS the finger has
 * usually lifted and momentum scrolling is carrying the page by the time the
 * clip crosses into view, so no touchstart lands while it is on screen
 * either. Both are registered in the capture phase (see below): the page
 * scrolls inside #page-scroller, and `scroll` from a nested scroller does
 * not bubble to window — but capture still walks window → scroller on the
 * way down.
 */
const GESTURE_RETRY_EVENTS = [
  "pointerdown",
  "touchstart",
  "touchend",
  "keydown",
  "wheel",
  "scroll",
] as const;

/**
 * Keep retrying a refused `play()` for as long as the clip is on screen.
 *
 * Every retry above is edge-triggered, and all of those edges can be spent
 * before the clip is ever eligible to play. The warm observer attaches `src`
 * ~2.5 scrollports early, so `loadeddata`/`canplay`/`canplaythrough` — the
 * whole media set — fire while the clip is still far below the fold, where
 * `attempt()` bails on `!inView`. They never fire a second time. By the time
 * the clip does scroll in there is exactly one `play()` call left, from the
 * play observer, and if that one is refused nothing re-arms: the observer
 * will not fire again while the clip sits in view, and the visitor may never
 * produce a gesture.
 *
 * A refusal is not sticky, though — it is decided per call. iOS Low Power
 * Mode refuses muted inline autoplay outright (and Chrome on iOS is WebKit,
 * so it refuses identically, which is why this reads as a Safari *and*
 * Chrome bug), as do Android battery/data saver modes; the same call
 * succeeds moments later once the OS relaxes or the user touches anything.
 * So poll while the clip is visible rather than waiting for an edge that may
 * never come. Cheap: it only runs while the section is actually on screen,
 * stops the moment playback starts, and gives up after a few seconds.
 */
const RETRY_INTERVAL_MS = 400;
const MAX_RETRY_MS = 8000;

/** A dropped or truncated media fetch leaves the element erroring with only
    the poster on screen, and — unlike a refused play() — nothing in the
    media set ever fires again. Re-attach the source a bounded number of
    times so one flaky request on a mobile network isn't fatal for the visit. */
const MAX_RELOADS = 2;

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
 * playback — plus, while the clip is actually on screen, on a timer, because
 * every one of those events can have fired and been spent before the clip
 * was eligible to play at all (see RETRY_INTERVAL_MS) — until the clip has
 * actually run to `ended`.
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

    let retryTimer: ReturnType<typeof setInterval> | undefined;
    let retryDeadline = 0;
    let reloads = 0;

    const stopRetrying = () => {
      if (retryTimer === undefined) return;
      clearInterval(retryTimer);
      retryTimer = undefined;
    };
    teardown.push(stopRetrying);

    const attempt = () => {
      if (detached || !inView || !video.paused) return;
      void video.play().catch(() => {});
    };

    /** Runs only while the clip is on screen and still stopped; see
        RETRY_INTERVAL_MS for why an edge-triggered retry isn't enough. */
    const startRetrying = () => {
      if (detached || retryTimer !== undefined) return;
      retryDeadline = Date.now() + MAX_RETRY_MS;
      retryTimer = setInterval(() => {
        if (detached || !inView || Date.now() > retryDeadline) {
          stopRetrying();
          return;
        }
        attempt();
      }, RETRY_INTERVAL_MS);
    };

    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (!inView) {
        stopRetrying();
        return;
      }
      attempt();
      startRetrying();
    }, { ...PLAY_OBSERVER_OPTIONS, root: observerRoot() });
    observer.observe(video);
    teardown.push(() => observer.disconnect());

    // Playback actually started — no reason to keep polling. (`paused` alone
    // is not proof: it flips false the instant play() is called, well before
    // the decoder has produced anything.)
    const onPlaying = () => stopRetrying();
    video.addEventListener("playing", onPlaying);
    teardown.push(() => video.removeEventListener("playing", onPlaying));

    // See MAX_RELOADS — a failed fetch is the one state the retry events
    // above cannot recover from on their own.
    const recover = () => {
      if (detached || reloads >= MAX_RELOADS) return;
      reloads += 1;
      video.load();
      attempt();
    };
    video.addEventListener("error", recover);
    teardown.push(() => video.removeEventListener("error", recover));

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
      const options = { passive: true, capture: true } as const;
      window.addEventListener(event, attempt, options);
      teardown.push(() => window.removeEventListener(event, attempt, options));
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
