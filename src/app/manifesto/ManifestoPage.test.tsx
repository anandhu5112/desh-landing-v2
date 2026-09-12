import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ManifestoPage from "./ManifestoPage";

// ScrollRoot's <LiquidGlass> renders its own displacement map on mount via a
// 2D canvas context, which jsdom doesn't implement (no `canvas` package here)
// — that's a jsdom gap, not something this page's own tests are about, so
// it's stubbed to a passthrough the same way ContactModalProvider.test.tsx
// stubs the Cal.com embed.
vi.mock("@/components/ScrollRoot", () => ({
  default: ({ children }: { children: ReactNode }) => children,
}));

/** Captures every element handed to the observer, so a test can decide when
    each one "enters view" instead of waiting on a real layout jsdom does not
    have. */
type Observed = { el: Element; fire: (isIntersecting: boolean) => void };

let observed: Observed[] = [];
let disconnected = false;

function installIntersectionObserver() {
  observed = [];
  disconnected = false;

  class FakeIntersectionObserver {
    private callback: IntersectionObserverCallback;

    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
    }

    observe(el: Element) {
      observed.push({
        el,
        fire: (isIntersecting: boolean) =>
          this.callback(
            [{ target: el, isIntersecting } as IntersectionObserverEntry],
            this as unknown as IntersectionObserver,
          ),
      });
    }

    unobserve(el: Element) {
      observed = observed.filter((entry) => entry.el !== el);
    }

    disconnect() {
      disconnected = true;
      observed = [];
    }
  }

  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
}

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: reduce && query.includes("reduce"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    })),
  );
}

beforeEach(() => {
  installIntersectionObserver();
  stubReducedMotion(false);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("manifesto copy", () => {
  it("opens on the line the letter is built around and closes on the welcome", () => {
    const { container } = render(<ManifestoPage />);

    // Read as text: the house script treatment splits a word across spans.
    expect(container.querySelector("h1")?.textContent).toBe(
      "A world away.Still home.",
    );
    expect(
      screen.getByText(
        /A life abroad should bring you closer to everything you hoped to build at home\./,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("heading", { level: 2 }).at(-1)?.textContent,
    ).toBe("Welcome to Desh.");
  });

  it("reads as one letter with one unboxed statement and no career biography", () => {
    const { container } = render(<ManifestoPage />);
    expect(container.querySelector("aside")).toBeNull();
    expect(screen.queryByText(/WHERE IT ALL BEGAN/)).not.toBeInTheDocument();
    expect(screen.queryByText(/OUR CONVICTION/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Yubi/)).not.toBeInTheDocument();
    const headings = screen.getAllByRole("heading", { level: 2 });
    expect(headings.map((heading) => heading.textContent)).toEqual([
      "Indians abroad deserve better",
      "Welcome to Desh.",
    ]);
    expect(
      screen.getByText(/So we're building Desh:/),
    ).toBeInTheDocument();
  });

  it("includes the new letter's opening, diaspora figures, and closing promise", () => {
    render(<ManifestoPage />);
    const letter = screen.getByRole("article");
    expect(letter).toHaveTextContent("Hi Reader far from home,");
    expect(letter).toHaveTextContent("You moved abroad. Your connection to India moved with you.");
    expect(letter).toHaveTextContent("34 Million people");
    expect(letter).toHaveTextContent("208 countries");
    expect(letter).toHaveTextContent("$135.6 billion");
    expect(letter).toHaveTextContent("Within a decade, more Indians will live outside the country than ever before");
    expect(letter).toHaveTextContent("We're building Desh so distance is never the reason that connection breaks.");
    expect(letter).not.toHaveTextContent("We both grew up in Kerala");
  });

  /**
   * The letter is signed by two people, and the portraits carry no alt text
   * of their own — the signature keeps their names together so
   * a screen reader can identify the authors.
   */
  it("signs the letter with both names in text", () => {
    const { container } = render(<ManifestoPage />);

    expect(screen.getByText("Aswin and Vinayak")).toBeInTheDocument();
    // The portrait lockup itself stays out of the accessibility tree, or
    // both names get announced twice.
    expect(
      container.querySelector('[aria-hidden="true"] img[alt=""]'),
    ).toBeInTheDocument();
  });

  it("gives each signatory a portrait, in signing order", () => {
    const { container } = render(<ManifestoPage />);

    const portraits = Array.from(
      container.querySelectorAll<HTMLImageElement>(
        '[aria-hidden="true"] > span img',
      ),
    );
    expect(portraits).toHaveLength(2);
    // Order is what pairs the circles with the names in .signature.
    expect(portraits[0].getAttribute("src")).toContain("aswin-portrait");
    expect(portraits[1].getAttribute("src")).toContain("vinayak-portrait");
  });

  it("offers a way out of the letter at both ends", () => {
    render(<ManifestoPage />);

    // The site nav's brand mark is the way home now, replacing the page's
    // own "Back to Desh" link.
    expect(screen.getAllByRole("link", { name: "Desh" }).at(0)).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.getByRole("link", { name: /let's talk money/i }),
    ).toHaveAttribute("href", "/book");
  });

  it("links the cover to the letter and keeps the cover readable before reveals", () => {
    const { container } = render(<ManifestoPage />);
    expect(
      screen.getByRole("link", { name: /read our letter/i }),
    ).toHaveAttribute("href", "#letter");
    expect(
      screen.getByRole("article", { name: /a letter from the founders/i }),
    ).toHaveAttribute("id", "letter");
    expect(container.querySelector("h1")?.closest("[data-reveal]")).toBeNull();
  });
});

describe("manifesto reveal", () => {
  it("holds each block hidden until it enters view, then releases only that one", () => {
    const { container } = render(<ManifestoPage />);

    const hidden = container.querySelectorAll('[data-reveal="hidden"]');
    expect(hidden.length).toBeGreaterThan(0);
    // Every hidden block is being watched — one left unobserved would stay
    // invisible for the whole visit.
    expect(observed.length).toBe(hidden.length);

    const [first, second] = observed;
    first.fire(true);

    expect(first.el.getAttribute("data-reveal")).toBe("shown");
    expect(second.el.getAttribute("data-reveal")).toBe("hidden");
  });

  it("ignores a block that scrolls past without ever intersecting", () => {
    render(<ManifestoPage />);

    const [first] = observed;
    first.fire(false);

    expect(first.el.getAttribute("data-reveal")).toBe("hidden");
  });

  it("shows the whole letter at once when motion is not wanted", () => {
    stubReducedMotion(true);
    const { container } = render(<ManifestoPage />);

    expect(container.querySelectorAll('[data-reveal="hidden"]').length).toBe(0);
    // Nothing to observe either — the observer is never constructed.
    expect(observed.length).toBe(0);
  });

  it("shows the whole letter when the browser has no IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { container } = render(<ManifestoPage />);

    expect(container.querySelectorAll('[data-reveal="hidden"]').length).toBe(0);
  });

  it("stops observing when the page unmounts", () => {
    const { unmount } = render(<ManifestoPage />);
    unmount();

    expect(disconnected).toBe(true);
  });
});
