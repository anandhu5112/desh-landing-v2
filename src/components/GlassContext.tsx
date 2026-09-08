"use client";

import React, { createContext, useContext, useMemo, useState, ReactNode } from "react";

/** id on the nav pill, so the glass lens can measure what it sits under. */
export const NAV_PILL_ID = "nav-pill";

/**
 * The pill's own chrome — plain CSS, drawn on top of the refraction.
 *
 * Tuned against the live page and signed off as a set — the pill stays at 18%
 * black so the refraction underneath reads through it, while the blur,
 * saturate and contrast give the surface its own body.
 */
export interface GlassConfig {
  blur: number;
  opacity: number;
  saturate: number;
  contrast: number;
  rimLight: number;
  shadowOpacity: number;
}

/**
 * The lens itself — passed straight through to <LiquidGlass>.
 *
 * `strength` is a fraction of the *container*, and the container is the whole
 * viewport, so the physical refraction is `strength × √(W² + H²) / √2` px —
 * about 1200 × strength on a 1440×900 screen, i.e. ~35px at the value below.
 * That is why it is well under the library's own 0.1 default: the same number
 * tuned against a small demo box would throw the page a hundred-plus pixels
 * sideways.
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

interface GlassContextValue {
  config: GlassConfig;
  setConfig: React.Dispatch<React.SetStateAction<GlassConfig>>;
  lens: LensConfig;
  setLens: React.Dispatch<React.SetStateAction<LensConfig>>;
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

  const value = useMemo(
    () => ({ config, setConfig, lens, setLens }),
    [config, lens],
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
