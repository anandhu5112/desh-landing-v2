import { describe, expect, it } from "vitest";
import { frostBlurPx, toYbouaneConfig, wantsYbouaneGlass } from "./ybouaneGlass";
import type { WebGlLensConfig } from "@/components/GlassContext";

const webgl: WebGlLensConfig = {
  refraction: 0.72,
  blurAmount: 0.42,
  chromAberration: 0.09,
  edgeHighlight: 0,
  specular: 0,
  fresnel: 0.25,
  zRadius: 31,
  saturation: 0,
  brightness: -0.16,
  distortion: 0.11,
};

describe("wantsYbouaneGlass", () => {
  it("is the default Safari / iOS path and stays off on Blink", () => {
    expect(wantsYbouaneGlass("", false)).toBe(false);
    expect(wantsYbouaneGlass("", true)).toBe(true);
    expect(wantsYbouaneGlass("?tune=1", true)).toBe(true);
  });

  it("can force WebGL on Blink or canvas fallback on WebKit", () => {
    expect(wantsYbouaneGlass("?glass=webgl", false)).toBe(true);
    expect(wantsYbouaneGlass("?glass=canvas", true)).toBe(false);
  });
});

describe("toYbouaneConfig", () => {
  it("passes the tuner knobs through and pins the pill radius", () => {
    const cfg = toYbouaneConfig(webgl);
    expect(cfg).toMatchObject(webgl);
    expect(cfg.cornerRadius).toBe(16);
  });

  it("leaves scrim, tint and shadow to the pill's CSS", () => {
    const cfg = toYbouaneConfig({ ...webgl, brightness: -0.2 });
    expect(cfg.shadowOpacity).toBe(0);
    expect(cfg.tintStrength).toBe(0);
    expect(cfg.floating).toBe(false);
    // brightness is a tuner knob and so does pass through.
    expect(cfg.brightness).toBe(-0.2);
  });
});

describe("frostBlurPx", () => {
  it("scales the 0–1 blur into CSS px for the below-hero frost", () => {
    expect(frostBlurPx(webgl)).toBe(8.4);
    expect(frostBlurPx({ ...webgl, blurAmount: 0 })).toBe(0);
    expect(frostBlurPx({ ...webgl, blurAmount: 1 })).toBe(20);
  });
});
