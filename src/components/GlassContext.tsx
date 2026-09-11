"use client";

import React, { createContext, useContext, useMemo, useState, ReactNode } from "react";

/** id on the nav pill, so the glass lens can measure what it sits under. */
export const NAV_PILL_ID = "nav-pill";

/**
 * The pill's own chrome — plain CSS, drawn on top of the refraction.
 *
 * Blink (production): 18% black, 18px blur, 2.5 saturate, 1.5 contrast,
 * rim 0.2, shadow 0.25. That is the signed-off Chrome surface. Safari / iOS
 * never reads this set — it uses `safariPill` and no backdrop-filter, because
 * saturate/contrast over the hero sky is what turned the pill cyan on WebKit.
 */
export interface PillChrome {
  opacity: number;
  rimLight: number;
  shadowOpacity: number;
}

export interface GlassConfig extends PillChrome {
  blur: number;
  saturate: number;
  contrast: number;
}

/**
 * The lens itself — passed straight through to <LiquidGlass>.
 *
 * `strength` is a fraction of the *container*, and the container is the whole
 * viewport, so the physical refraction is `strength × √(W² + H²) / √2` px —
 * about 1200 × strength on a 1440×900 screen, i.e. ~35px at the value below.
 * That is why it is well under the library's own 0.1 default: the same number
 * tuned against a small demo box would throw the page a hundred-plus pixels
 * sideways. Blink uses this unscaled, matching production. Safari never
 * reads it — YbouaneNavGlass has its own `webgl` knobs.
 */
export interface LensConfig {
  strength: number;
  chromaticAberration: number;
  blur: number;
  depth: number;
  curvature: number;
  glow: number;
  edgeHighlight: number;
  specular: number;
}

/**
 * The Safari / iOS lens — @ybouane/liquidglass's own knobs, passed straight
 * through by YbouaneNavGlass. Separate from LensConfig because the two
 * pipelines share no units: `refraction` here is a shader gain, not a
 * displacement-map scale, and `blurAmount` is 0–1, not CSS px.
 *
 * Corner radius, shadow and tint are deliberately not here: the pill's own
 * CSS draws its radius, scrim, rim and drop shadow over the refraction, on
 * every engine, so the shader must not double them.
 */
export interface WebGlLensConfig {
  refraction: number;
  blurAmount: number;
  chromAberration: number;
  edgeHighlight: number;
  specular: number;
  fresnel: number;
  /** Bevel depth in CSS px — how far in from the edge the curvature reaches. */
  zRadius: number;
  saturation: number;
  brightness: number;
  distortion: number;
}

interface GlassContextValue {
  config: GlassConfig;
  setConfig: React.Dispatch<React.SetStateAction<GlassConfig>>;
  /** Pill chrome for the Safari / iOS WebGL path only. Blink never reads this. */
  safariPill: PillChrome;
  setSafariPill: React.Dispatch<React.SetStateAction<PillChrome>>;
  lens: LensConfig;
  setLens: React.Dispatch<React.SetStateAction<LensConfig>>;
  webgl: WebGlLensConfig;
  setWebgl: React.Dispatch<React.SetStateAction<WebGlLensConfig>>;
}

const GlassContext = createContext<GlassContextValue | null>(null);

export function GlassProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<GlassConfig>({
    blur: 18,
    opacity: 0.18,
    saturate: 2.5,
    contrast: 1.5,
    rimLight: 0.2,
    shadowOpacity: 0.25,
  });

  // Safari / iOS only — signed off on a real iPhone with ?tune=1.
  const [safariPill, setSafariPill] = useState<PillChrome>({
    opacity: 0.04,
    rimLight: 0.05,
    shadowOpacity: 0,
  });

  const [lens, setLens] = useState<LensConfig>({
    strength: 0.029,
    chromaticAberration: 0.6,
    blur: 2.5,
    depth: 15,
    curvature: 0.4,
    glow: 1,
    edgeHighlight: 0.3,
    specular: 0.75,
  });

  // Signed off on a real iPhone with ?tune=1 (Safari / iOS WebGL path).
  const [webgl, setWebgl] = useState<WebGlLensConfig>({
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
  });

  const value = useMemo(
    () => ({
      config,
      setConfig,
      safariPill,
      setSafariPill,
      lens,
      setLens,
      webgl,
      setWebgl,
    }),
    [config, safariPill, lens, webgl],
  );

  return <GlassContext.Provider value={value}>{children}</GlassContext.Provider>;
}

export function useGlassConfig() {
  const ctx = useContext(GlassContext);
  if (!ctx) {
    throw new Error("useGlassConfig must be used within a GlassProvider");
  }
  return ctx;
}
