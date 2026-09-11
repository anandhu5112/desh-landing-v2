import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import BloomSection from "./BloomSection";
import { SCROLLER_ID } from "@/lib/scroller";

vi.mock("next/image", () => ({
  default: ({
    alt,
    priority,
    fill,
    sizes,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    priority?: boolean;
    fill?: boolean;
  }) => {
    void priority;
    void fill;
    void sizes;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img alt={alt ?? ""} {...props} />
    );
  },
}));

// Mock ContactModalProvider
vi.mock("@/components/ContactModalProvider", () => ({
  useContactModal: () => ({
    open: vi.fn(),
  }),
}));

type ObserverRecord = {
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  observe: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
};

let observers: ObserverRecord[] = [];
let scroller: HTMLDivElement;

function installIntersectionObserver() {
  class FakeIntersectionObserver {
    callback: IntersectionObserverCallback;
    options?: IntersectionObserverInit;
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();

    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
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

function fire(observer: ObserverRecord, isIntersecting: boolean) {
  const entry = { isIntersecting } as IntersectionObserverEntry;
  act(() => {
    observer.callback([entry], observer as unknown as IntersectionObserver);
  });
}

/** The warm (load-trigger) observer: identified by its rootMargin. */
function warmObserver() {
  return observers.find((o) => o.options?.rootMargin === "120% 0px");
}

/** The settle/visibility observer: only created once the atlases resolve,
 *  identified by having no rootMargin (unlike the warm observer). */
function visibilityObserver() {
  return observers.find((o) => o.options?.rootMargin === undefined);
}

/** Fires the warm observer and drains the atlas-decode promise chain
 *  (decode -> the async loadAtlas return -> Promise.all — a macrotask tick
 *  reliably clears all of that, a fixed number of microtask ticks is
 *  fragile to reorder). Does not assume loading actually succeeded. */
async function triggerWarmLoad() {
  fire(warmObserver()!, true);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** Same, but for the success path: also fires the settle observer's
 *  initial state, since the section is on screen by the time its atlases
 *  finish loading in every realistic case (that's why the warm margin
 *  leads the viewport). Only valid once loading has actually resolved and
 *  created that observer. */
async function warmUpAndLoad() {
  await triggerWarmLoad();
  fire(visibilityObserver()!, true);
}

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
    drawImage: vi.fn(),
  });
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  Object.defineProperty(window.HTMLImageElement.prototype, "decode", {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
});

beforeEach(() => {
  observers = [];
  scroller = document.createElement("div");
  scroller.id = SCROLLER_ID;
  document.body.appendChild(scroller);
  installIntersectionObserver();
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn().mockReturnValue(0) as unknown as typeof requestAnimationFrame,
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  (window.HTMLImageElement.prototype.decode as ReturnType<typeof vi.fn>)
    .mockReset()
    .mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  scroller.remove();
  // Not restoreAllMocks(): getContext/decode are plain vi.fn()s installed
  // once in beforeAll (not vi.spyOn), and restoreAllMocks() resets those
  // to a bare no-op too — breaking canvas access for every test after the
  // first. unstubAllGlobals() alone reverses this file's per-test
  // vi.stubGlobal calls (IntersectionObserver, requestAnimationFrame,
  // cancelAnimationFrame).
  vi.unstubAllGlobals();
});

describe("BloomSection coin slider", () => {
  it("renders the monthly investment slider with coin thumb image", () => {
    render(<BloomSection />);

    const slider = screen.getByRole("slider", {
      name: /monthly investment amount in rupees/i,
    });
    expect(slider).toBeDefined();
    expect(slider).toHaveValue("25000");

    // The coin image should be rendered with slider-coin
    const coinImg = document.querySelector('img[src*="slider-coin"]');
    expect(coinImg).not.toBeNull();
    expect(coinImg?.getAttribute("src")).toContain("slider-coin.webp");
  });

  it("updates value and estimated corpus when dragging or changing the slider", () => {
    render(<BloomSection />);

    const slider = screen.getByRole("slider", {
      name: /monthly investment amount in rupees/i,
    });

    // Check initial display
    expect(screen.getByDisplayValue("₹25,000")).toBeDefined();

    // Change slider value to ₹50,000
    fireEvent.change(slider, { target: { value: "50000" } });

    expect(slider).toHaveValue("50000");
    expect(screen.getByDisplayValue("₹50,000")).toBeDefined();
  });

  it("calculates dynamic position for the coin thumb and progress fill", () => {
    render(<BloomSection />);

    const fillBar = document.querySelector('[class*="sliderFill"]') as HTMLElement;
    const thumb = document.querySelector('[class*="sliderThumb"]') as HTMLElement;

    expect(fillBar).not.toBeNull();
    expect(thumb).not.toBeNull();

    // At initial ₹25,000, ratio is (25000 - 1000) / (200000 - 1000) = 24 / 199 ≈ 12.06%
    // positionCalc is calc(pct% + offset px)
    expect(fillBar.style.width).toContain("calc(");
    expect(thumb.style.left).toContain("calc(");
    expect(fillBar.style.width).toBe(thumb.style.left);
  });
});

describe("BloomSection WhatsApp community", () => {
  it("renders the Join community link with WhatsApp URL", () => {
    render(<BloomSection />);

    const link = screen.getByRole("link", { name: /join community/i });
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toContain("chat.whatsapp.com");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("renders the QR code image for WhatsApp community", () => {
    render(<BloomSection />);

    const qrImg = screen.getByAltText(/qr code to join the desh whatsapp community/i);
    expect(qrImg).toBeDefined();
    expect(qrImg.getAttribute("src")).toContain("community-qr.svg");
  });
});


describe("BloomSection amount editing", () => {
  it.each([
    ["₹1,75,000", "175000", "₹1,75,000"],
    ["999999", "200000", "₹2,00,000"],
    ["-5", "1000", "₹1,000"],
    ["25500", "26000", "₹26,000"],
    ["", "25000", "₹25,000"],
    ["oops", "25000", "₹25,000"],
    ["Infinity", "25000", "₹25,000"],
  ])("commits %s safely", (draft, amount, display) => {
    render(<BloomSection />);
    const input = screen.getByRole("textbox", { name: "Monthly investment" });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: draft } });
    fireEvent.blur(input);
    expect(input).toHaveValue(display);
    expect(screen.getByRole("slider")).toHaveValue(amount);
  });

  it("focuses with the pencil, commits on Enter and cancels on Escape", () => {
    render(<BloomSection />);
    const input = screen.getByRole("textbox", { name: "Monthly investment" });
    fireEvent.click(screen.getByRole("button", { name: "Edit monthly investment" }));
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: "50000" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input).toHaveValue("₹50,000");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "100000" } });
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.blur(input);
    expect(input).toHaveValue("₹50,000");
  });

  it("updates the result and duration label for every preset", () => {
    render(<BloomSection />);
    for (const years of [5, 10, 15, 20, 25, 30]) {
      const option = screen.getByRole("radio", { name: `${years} yrs` });
      fireEvent.click(option);
      expect(option).toHaveAttribute("aria-checked", "true");
      expect(screen.getByText(`Estimated value in ${years} years`)).toBeInTheDocument();
      const value = Math.round(25000 * ((1.01 ** (years * 12) - 1) / 0.01) * 1.01);
      expect(screen.getByText(`₹${value.toLocaleString("en-IN")}`)).toBeInTheDocument();
    }
  });
});

describe("BloomSection lazy bloom atlas loading", () => {
  it("shows the poster and holds off the atlas fetch until the calculator warms up", () => {
    render(<BloomSection />);

    // Poster shows immediately, cheap and always present.
    const poster = document.querySelector('img[src*="bloom-poster"]');
    expect(poster).not.toBeNull();

    // No atlas image constructed yet — window.Image is untouched by decode calls.
    expect(
      (window.HTMLImageElement.prototype.decode as ReturnType<typeof vi.fn>),
    ).not.toHaveBeenCalled();

    const warm = warmObserver();
    expect(warm).toBeDefined();
    expect(warm?.observe).toHaveBeenCalled();
    // Must observe against the actual scroller, not the viewport — the page
    // scrolls inside #page-scroller, not the window.
    expect(warm?.options?.root).toBe(scroller);
  });

  it("requests the atlases once the calculator nears the scrollport, and reveals the canvas after decode", async () => {
    render(<BloomSection />);

    await warmUpAndLoad();

    expect(window.HTMLImageElement.prototype.decode).toHaveBeenCalled();
    const canvas = document.querySelector("canvas")!;
    expect(canvas.className).toMatch(/bloomReady/);
  });

  it("does not request the atlases while still far from the scrollport", () => {
    render(<BloomSection />);

    fire(warmObserver()!, false);

    expect(window.HTMLImageElement.prototype.decode).not.toHaveBeenCalled();
  });

  it("keeps the calculator usable if the atlas request fails", async () => {
    (window.HTMLImageElement.prototype.decode as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("decode failed"),
    );
    render(<BloomSection />);

    await triggerWarmLoad();

    // Controls remain fully interactive even though the canvas never became ready.
    const slider = screen.getByRole("slider", { name: /monthly investment amount in rupees/i });
    fireEvent.change(slider, { target: { value: "50000" } });
    expect(slider).toHaveValue("50000");
    const canvas = document.querySelector("canvas")!;
    expect(canvas.className).not.toMatch(/bloomReady/);
  });

  it("changing a control before loading completes does not throw and is picked up once ready", async () => {
    render(<BloomSection />);

    // Rapid interaction while the atlases are still in flight.
    fireEvent.click(screen.getByRole("radio", { name: "30 yrs" }));
    fireEvent.change(screen.getByRole("slider", { name: /monthly investment amount in rupees/i }), {
      target: { value: "150000" },
    });

    await warmUpAndLoad();

    const canvas = document.querySelector("canvas")!;
    expect(canvas.className).toMatch(/bloomReady/);
    expect(screen.getByText("Estimated value in 30 years")).toBeInTheDocument();
  });

  it("scrolling away and back before loading finishes does not request a second atlas load", async () => {
    render(<BloomSection />);

    fire(warmObserver()!, true);
    // Scrolled straight back out before the fetch resolves — the warm
    // observer already disconnected itself on first fire, so this is a
    // no-op rather than a second load.
    fire(warmObserver()!, false);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(window.HTMLImageElement.prototype.decode).toHaveBeenCalledTimes(2); // one per atlas
    expect(warmObserver()?.disconnect).toHaveBeenCalled();
  });
});

describe("BloomSection animation loop lifecycle", () => {
  it("stops scheduling animation frames once the bloom settles on its target", async () => {
    render(<BloomSection />);
    await warmUpAndLoad();

    const raf = window.requestAnimationFrame as unknown as ReturnType<typeof vi.fn>;
    raf.mockClear();

    // Nothing changed yet, so the bloom is already sitting on its initial
    // target — move it, so there is an actual delta for the loop to close.
    fireEvent.click(screen.getByRole("radio", { name: "30 yrs" }));
    expect(raf).toHaveBeenCalledTimes(1);

    // Drive the loop forward with capped 64ms frames (same cap the tick
    // itself applies) until it stops rescheduling itself, i.e. settles.
    let now = performance.now();
    let settled = false;
    for (let i = 0; i < 60; i++) {
      const tick = raf.mock.calls[raf.mock.calls.length - 1][0] as FrameRequestCallback;
      const callsBefore = raf.mock.calls.length;
      now += 64;
      act(() => tick(now));
      if (raf.mock.calls.length === callsBefore) {
        settled = true;
        break;
      }
    }

    expect(settled).toBe(true);
  });

  it("restarts the loop when the monthly amount changes after settling", async () => {
    render(<BloomSection />);
    await warmUpAndLoad();

    const raf = window.requestAnimationFrame as unknown as ReturnType<typeof vi.fn>;
    const callsBefore = raf.mock.calls.length;

    fireEvent.change(screen.getByRole("slider", { name: /monthly investment amount in rupees/i }), {
      target: { value: "180000" },
    });

    expect(raf.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it("restarts the loop when the duration preset changes after settling", async () => {
    render(<BloomSection />);
    await warmUpAndLoad();

    const raf = window.requestAnimationFrame as unknown as ReturnType<typeof vi.fn>;
    const callsBefore = raf.mock.calls.length;

    fireEvent.click(screen.getByRole("radio", { name: "5 yrs" }));

    expect(raf.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it("does not restart the loop for an off-screen calculator until it scrolls back into view", async () => {
    render(<BloomSection />);
    await warmUpAndLoad();

    const visibility = visibilityObserver();
    expect(visibility).toBeDefined();
    expect(visibility?.options?.root).toBe(scroller);

    fire(visibility!, false); // scrolled away

    const raf = window.requestAnimationFrame as unknown as ReturnType<typeof vi.fn>;
    const callsWhileOffscreen = raf.mock.calls.length;
    fireEvent.change(screen.getByRole("slider", { name: /monthly investment amount in rupees/i }), {
      target: { value: "10000" },
    });
    expect(raf.mock.calls.length).toBe(callsWhileOffscreen);

    fire(visibility!, true); // back in view
    expect(raf.mock.calls.length).toBeGreaterThan(callsWhileOffscreen);
  });

  it("respects reduced motion by settling immediately without scheduling a loop", async () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<BloomSection />);
    await warmUpAndLoad();

    const raf = window.requestAnimationFrame as unknown as ReturnType<typeof vi.fn>;
    expect(raf).not.toHaveBeenCalled();

    const canvas = document.querySelector("canvas")!;
    expect(canvas.className).toMatch(/bloomReady/);
  });
});
