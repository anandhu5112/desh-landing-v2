import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ManifestoPage from "./ManifestoPage";

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

    // Read as text, not by accessible name: both of these headings have their
    // opening letter split into its own span for the script drop cap.
    expect(container.querySelector("h1")?.textContent).toBe("Desh.");
    expect(
      screen.getByText(
        /For generations, Indians have left home to build a life somewhere else\./,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("heading", { level: 2 }).at(-1)?.textContent,
    ).toBe("Welcome to Desh.");
  });

  /**
   * The four turns are the page's only structure — everything between them
   * is running prose. They are headings so that structure survives into the
   * accessibility tree and into a search result, not just into the type
   * scale, so their level is pinned here rather than left to CSS.
   */
  it("sets each turn in the argument as a real heading", () => {
    render(<ManifestoPage />);

    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent ?? "");

    expect(headings[0]).toMatch(
      /^Most Indian financial products were built for people living in India\./,
    );
    // The punchline is part of that same heading, not a paragraph after it.
    expect(headings[0]).toMatch(
      /If you live abroad, you are usually an exception to the flow\./,
    );
    expect(headings[1]).toBe("So we started Desh.");
    expect(headings[2]).toBe("A financial home for Indians abroad.");
    expect(headings[3]).toBe("Welcome to Desh.");
  });

  it("keeps the seven things Desh is for, each on its own line", () => {
    render(<ManifestoPage />);

    const lines = [
      "A place to invest.",
      "Move money.",
      "Manage accounts.",
      "Understand taxes.",
      "Buy insurance.",
      "Purchase property.",
      "Get credit.",
    ];

    for (const line of lines) {
      // Own element per line — a paragraph containing all seven would match
      // a substring check but not this one.
      expect(screen.getByText(line)).toBeInTheDocument();
    }
  });

  /**
   * The letter is signed by two people, and the portraits carry no alt text
   * of their own — this line is the only place either name is readable, so
   * it is what a screen reader has to find.
   */
  it("signs the letter with both names in text", () => {
    const { container } = render(<ManifestoPage />);

    expect(screen.getByText("Aswin & Vinayak")).toBeInTheDocument();
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

    expect(screen.getByRole("link", { name: /back to desh/i })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.getByRole("link", { name: /book a conversation/i }),
    ).toHaveAttribute("href", "/book");
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
