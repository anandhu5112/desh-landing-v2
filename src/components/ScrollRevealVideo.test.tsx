import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { SCROLLER_ID } from "@/lib/scroller";

import ScrollRevealVideo, {
  PLAY_OBSERVER_OPTIONS,
  WARM_OBSERVER_OPTIONS,
} from "./ScrollRevealVideo";

type ObserverRecord = {
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
};

const observers: ObserverRecord[] = [];

function installIntersectionObserver() {
  class FakeIntersectionObserver {
    callback: IntersectionObserverCallback;
    options?: IntersectionObserverInit;
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();

    constructor(
      callback: IntersectionObserverCallback,
      options?: IntersectionObserverInit,
    ) {
      this.callback = callback;
      this.options = options;
      observers.push({
        callback,
        options,
        observe: this.observe,
        disconnect: this.disconnect,
      });
    }
  }

  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
}

function installPageScroller() {
  const scroller = document.createElement("div");
  scroller.id = SCROLLER_ID;
  document.body.appendChild(scroller);
  return scroller;
}

function fire(observer: ObserverRecord, isIntersecting: boolean) {
  const entry = { isIntersecting } as IntersectionObserverEntry;
  act(() => {
    observer.callback(
      [entry],
      observer as unknown as IntersectionObserver,
    );
  });
}

function byRootMargin(margin: string | undefined) {
  return observers.find((o) => o.options?.rootMargin === margin);
}

function byPlayObserver() {
  return observers.find(
    (o) => o.options?.threshold === 0 && o.options?.rootMargin === undefined,
  );
}

describe("currency reveal video assets", () => {
  const root = path.resolve(__dirname, "../../public");

  it("keeps the dollar and rupee clips small enough for a cold mobile load", () => {
    // These used to ship at 3.7MB + 2.2MB (1280/1440px sources). Phones only
    // paint them at ~320px, so a multi-megabyte first fetch left the animation
    // blank until the whole file arrived. Dollar is first on screen and must
    // finish during the hero scroll; keep it well under half a megabyte.
    const dollar = fs.statSync(path.join(root, "videos/us-dollar-720.mp4")).size;
    const rupee = fs.statSync(path.join(root, "videos/indian-ruppee-720.mp4")).size;
    expect(dollar).toBeLessThan(350 * 1024);
    expect(rupee).toBeLessThan(400 * 1024);
  });

  it("ships lightweight poster frames for the first paint", () => {
    expect(
      fs.existsSync(path.join(root, "images/us-dollar-poster.webp")),
    ).toBe(true);
    expect(
      fs.existsSync(path.join(root, "images/indian-ruppee-poster.webp")),
    ).toBe(true);
  });
});

describe("ScrollRevealVideo", () => {
  let scroller: HTMLDivElement;

  beforeEach(() => {
    observers.length = 0;
    scroller = installPageScroller();
    installIntersectionObserver();
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    scroller.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("shows the poster immediately and holds off the video src until warm", () => {
    const { container } = render(
      <ScrollRevealVideo
        src="/videos/us-dollar-720.mp4"
        poster="/images/us-dollar-poster.webp"
      />,
    );
    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    expect(video).toHaveAttribute("poster", "/images/us-dollar-poster.webp");
    expect(video).not.toHaveAttribute("src");
    expect(video).toHaveAttribute("preload", "none");

    const warm = byRootMargin(WARM_OBSERVER_OPTIONS.rootMargin as string);
    expect(warm).toBeDefined();
    expect(warm?.observe).toHaveBeenCalled();
    // Nested #page-scroller clips targets before a viewport rootMargin can
    // see them — warm has to observe against the scroller itself.
    expect(warm?.options?.root).toBe(scroller);
  });

  it("attaches src once the section is approaching, then plays when visible", () => {
    const { container } = render(
      <ScrollRevealVideo
        src="/videos/indian-ruppee-720.mp4"
        poster="/images/indian-ruppee-poster.webp"
      />,
    );
    const video = container.querySelector("video")!;

    fire(byRootMargin(WARM_OBSERVER_OPTIONS.rootMargin as string)!, true);

    expect(video).toHaveAttribute("src", "/videos/indian-ruppee-720.mp4");
    expect(video).toHaveAttribute("preload", "auto");

    const playObserver = byPlayObserver();
    expect(playObserver).toBeDefined();
    expect(playObserver?.options?.root).toBe(scroller);
    expect(playObserver?.options?.threshold).toBe(
      PLAY_OBSERVER_OPTIONS.threshold,
    );

    fire(playObserver!, true);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it("keeps retrying while the clip is on screen after a refused autoplay", async () => {
    vi.useFakeTimers();
    // WebKit in Low Power Mode (and Chrome on iOS, which is WebKit) refuses
    // muted inline autoplay outright. The refusal is per-call, not sticky.
    let refusals = 2;
    const play = vi.fn(() => {
      if (refusals > 0) {
        refusals -= 1;
        return Promise.reject(new Error("NotAllowedError"));
      }
      return Promise.resolve(undefined);
    });
    HTMLMediaElement.prototype.play = play as unknown as HTMLMediaElement["play"];

    render(<ScrollRevealVideo src="/videos/us-dollar-720.mp4" />);
    fire(byRootMargin(WARM_OBSERVER_OPTIONS.rootMargin as string)!, true);
    fire(byPlayObserver()!, true);

    // The one observer-driven attempt was refused. Nothing else is edge-
    // triggered any more: the media events fired while the clip was still
    // off screen, and a wheel-scrolling visitor produces no pointer/touch/key
    // event at all. Only the timer can recover this.
    expect(play).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200);
    });

    expect(play.mock.calls.length).toBeGreaterThan(1);
    vi.useRealTimers();
  });

  it("stops polling once the clip scrolls back off screen", async () => {
    vi.useFakeTimers();
    const play = vi.fn(() => Promise.reject(new Error("NotAllowedError")));
    HTMLMediaElement.prototype.play = play as unknown as HTMLMediaElement["play"];

    render(<ScrollRevealVideo src="/videos/us-dollar-720.mp4" />);
    fire(byRootMargin(WARM_OBSERVER_OPTIONS.rootMargin as string)!, true);
    fire(byPlayObserver()!, true);
    fire(byPlayObserver()!, false);

    const calls = play.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(play.mock.calls.length).toBe(calls);
    vi.useRealTimers();
  });

  it("re-attaches the source when the media fetch fails outright", () => {
    const load = vi.fn();
    HTMLMediaElement.prototype.load = load;

    const { container } = render(
      <ScrollRevealVideo src="/videos/us-dollar-720.mp4" />,
    );
    const video = container.querySelector("video")!;
    fire(byRootMargin(WARM_OBSERVER_OPTIONS.rootMargin as string)!, true);

    // A dropped fetch leaves only the poster up, and no media retry event
    // ever fires again — without this the visit is over for this clip.
    act(() => {
      video.dispatchEvent(new Event("error"));
    });
    expect(load).toHaveBeenCalledTimes(1);

    // Bounded, so a permanently-404ing asset can't spin forever.
    act(() => {
      video.dispatchEvent(new Event("error"));
      video.dispatchEvent(new Event("error"));
    });
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("retries on a wheel scroll, which is how desktop visitors arrive", () => {
    const play = vi.fn(() => Promise.reject(new Error("NotAllowedError")));
    HTMLMediaElement.prototype.play = play as unknown as HTMLMediaElement["play"];

    render(<ScrollRevealVideo src="/videos/us-dollar-720.mp4" />);
    fire(byRootMargin(WARM_OBSERVER_OPTIONS.rootMargin as string)!, true);
    fire(byPlayObserver()!, true);
    const calls = play.mock.calls.length;

    act(() => {
      window.dispatchEvent(new Event("wheel"));
    });
    expect(play.mock.calls.length).toBeGreaterThan(calls);
  });

  it("does not attach src while the warm observer stays out of range", () => {
    const { container } = render(
      <ScrollRevealVideo src="/videos/us-dollar-720.mp4" />,
    );
    const video = container.querySelector("video")!;

    fire(byRootMargin(WARM_OBSERVER_OPTIONS.rootMargin as string)!, false);

    expect(video).not.toHaveAttribute("src");
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });
});
