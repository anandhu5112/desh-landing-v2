import { describe, expect, it } from "vitest";
import { glassStrengthScale } from "./glass";

describe("glass refraction across viewport sizes", () => {
  it("preserves the documented desktop reference", () => {
    expect(glassStrengthScale(1440, 900)).toBe(1);
  });

  it.each([[390, 844], [844, 390], [390, 664], [768, 1024], [1920, 1080]])(
    "keeps the physical displacement and chromatic separation at %dx%d",
    (width, height) => {
      const reference = 0.029 * Math.hypot(1440, 900) / Math.SQRT2;
      const physical = 0.029 * glassStrengthScale(width, height) * Math.hypot(width, height) / Math.SQRT2;
      for (const channel of [1, 1.06, 1.12]) {
        expect(physical * channel).toBeCloseTo(reference * channel, 10);
      }
    },
  );

  it.each([[0, 0], [0, 844], [-1, 900], [NaN, 900], [Infinity, 900]])(
    "keeps an unmeasured surface safe at %dx%d",
    (width, height) => expect(glassStrengthScale(width, height)).toBe(1),
  );
});
