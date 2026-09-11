import { describe, expect, it } from "vitest";
import { heroPinRangeHeight } from "./heroPin";

describe("heroPinRangeHeight", () => {
  it("adds the cinematic extra as a share of the scroller, not the hero", () => {
    // 186.5% of an 800px scroller is 1492px of extra scroll — the same
    // distance ScrollTrigger's `end: +=186.5%` covers — on top of an 800px hero.
    expect(heroPinRangeHeight(800, 800, 186.5)).toBe(800 + 1492);
  });

  it("keeps authored pacing when the hero is taller than the scroller", () => {
    // min-height: 800px on a 600px-tall phone. Extra is still 186.5% of 600.
    expect(heroPinRangeHeight(800, 600, 186.5)).toBe(800 + 1119);
  });

  it("keeps authored pacing on a tall desktop scroller", () => {
    expect(heroPinRangeHeight(1000, 1000, 186.5)).toBe(1000 + 1865);
  });

  it("falls back to the hero's own height when the scroller is unmeasured", () => {
    expect(heroPinRangeHeight(800, 0, 186.5)).toBe(800);
    expect(heroPinRangeHeight(800, -1, 186.5)).toBe(800);
  });

  it("falls back to the hero's own height when extra is not a finite amount", () => {
    expect(heroPinRangeHeight(800, 800, Number.NaN)).toBe(800);
    expect(heroPinRangeHeight(800, 800, Number.POSITIVE_INFINITY)).toBe(800);
    expect(heroPinRangeHeight(800, 800, -10)).toBe(800);
  });

  it("does not invent a pin range when the hero itself has no height", () => {
    expect(heroPinRangeHeight(0, 800, 186.5)).toBe(0);
    expect(heroPinRangeHeight(-1, 800, 186.5)).toBe(0);
  });
});
