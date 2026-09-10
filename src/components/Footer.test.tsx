import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { WORDMARK_DEFAULTS } from "./WordmarkTuner";

const IMAGES = path.resolve(__dirname, "../../public/images");

function pathData(file: string): string[] {
  const svg = fs.readFileSync(path.join(IMAGES, file), "utf8");
  return [...svg.matchAll(/\sd="([^"]+)"/g)].map((m) => m[1]);
}

/**
 * The glass wordmark is laid over a "Desh" that is already composited into
 * footer-scene.webp, and only works because it lands on those baked letters
 * to the pixel. Two things could break that silently, and neither shows up
 * in a component render, so they are checked here.
 */
describe("footer glass wordmark", () => {
  it("cuts its rim from the same outlines as the logotype", () => {
    // desh-wordmark-rim.svg is derived from desh-logo-mark.svg: the same
    // contours, stroked and clipped to themselves. Change the logotype
    // without regenerating the rim and the highlight drifts off the letters.
    const letters = pathData("desh-logo-mark.svg");
    const rim = pathData("desh-wordmark-rim.svg");

    expect(letters).not.toHaveLength(0);
    // Once inside the clipPath, once as the stroked outline.
    expect(rim).toEqual([...letters, ...letters]);
  });

  it("starts the tuner from the values the stylesheet actually declares", () => {
    // WordmarkTuner's Copy CSS button emits a block to paste over these
    // declarations. Let the two sets drift apart and a copy-paste silently
    // restyles the wordmark to whatever the panel happened to open at.
    const css = fs.readFileSync(path.resolve(__dirname, "Footer.module.css"), "utf8");
    const declared = Object.fromEntries(
      [...css.matchAll(/--wm-([a-z-]+):\s*([\d.]+)(?:deg)?;/g)].map((m) => [m[1], Number(m[2])]),
    );

    expect(Object.keys(declared).sort()).toEqual(Object.keys(WORDMARK_DEFAULTS).sort());
    expect(declared).toEqual(WORDMARK_DEFAULTS);
  });

  it("shares one coordinate space between the two masks", () => {
    // Both are stretched to the same box by mask-size: 100% 100%, so a
    // difference in viewBox would offset the rim from the letters.
    const viewBox = (file: string) =>
      /viewBox="([^"]+)"/.exec(fs.readFileSync(path.join(IMAGES, file), "utf8"))?.[1];

    expect(viewBox("desh-wordmark-rim.svg")).toBe(viewBox("desh-logo-mark.svg"));
    expect(viewBox("desh-logo-mark.svg")).toBe("0 0 63.0098 20.5117");
  });
});

describe("Footer component", () => {
  it("renders copyright, rights reserved, and Aswin's Instagram link without other social links", async () => {
    const { render, screen } = await import("@testing-library/react");
    const { default: Footer } = await import("./Footer");
    const { vi } = await import("vitest");

    window.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
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

    render(<Footer />);

    expect(screen.getByText("© 2026 Desh")).toBeInTheDocument();
    expect(screen.getByText("All rights reserved")).toBeInTheDocument();

    const instagramLink = screen.getByRole("link", { name: /instagram/i });
    expect(instagramLink).toBeInTheDocument();
    expect(instagramLink).toHaveAttribute("href", "https://www.instagram.com/aswinonfinance/");
    expect(instagramLink).toHaveAttribute("target", "_blank");

    expect(screen.queryByRole("link", { name: /Desh on X/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Desh on WhatsApp/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Desh on Facebook/i })).not.toBeInTheDocument();
  });
});

