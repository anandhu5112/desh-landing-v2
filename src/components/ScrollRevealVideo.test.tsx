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

function byThreshold(threshold: number) {
  return observers.find((o) => o.options?.threshold === threshold);
}

describe("currency reveal video assets", () => {
  const root = path.resolve(__dirname, "../../public");

  it("keeps the dollar and rupee clips small enough for a cold mobile load", () => {
    // These used to ship at 3.7MB + 2.2MB (1280/1440px sources). Phones only
    // paint them at 320px, so a multi-megabyte first fetch left the animation
    // blank until the whole file arrived. Cap stays well under 1MB each.
    const dollar = fs.statSync(path.join(root, "videos/us-dollar-720.mp4")).size;
    const rupee = fs.statSync(path.join(root, "videos/indian-ruppee-720.mp4")).size;
    expect(dollar).toBeLessThan(900 * 1024);
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

    const playObserver = byThreshold(PLAY_OBSERVER_OPTIONS.threshold as number);
    expect(playObserver).toBeDefined();
    expect(playObserver?.options?.root).toBe(scroller);

    fire(playObserver!, true);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
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
