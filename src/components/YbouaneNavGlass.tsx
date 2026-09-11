"use client";

import { useEffect, useRef, useState } from "react";
import { NAV_PILL_ID, useGlassConfig } from "./GlassContext";
import { paintHeroBehindPill, paintPageBehindPill } from "@/lib/webkitGlass";
import {
  YBOUANE_PILL_RADIUS,
  frostBlurPx,
  toYbouaneConfig,
  wantsYbouaneGlass,
} from "@/lib/ybouaneGlass";
import styles from "./YbouaneNavGlass.module.css";

import type { LiquidGlass } from "@ybouane/liquidglass";

/** Room around the pill so refraction can pull in pixels from beyond its edge. */
const PAD = 40;
/** Cap backdrop repaints — the sunrise moves every frame, the shader need not. */
const MIN_REPAINT_MS = 32;

/**
 * Safari / iOS nav glass — @ybouane/liquidglass WebGL, pill-sized.
 *
 * Same shape as WebKitNavGlass: a fixed overlay under the nav pill. The
 * backdrop is the reconstructed hero (plus live copy) while the pill sits
 * over those screens, and the real section (fill, video, logos, copy) on
 * every page after that — a flat grey fill is what made later sections
 * look like a white slab.
 *
 * Blink is unaffected: wantsYbouaneGlass is false there unless ?glass=webgl.
 */
export default function YbouaneNavGlass() {
  const [active, setActive] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLCanvasElement>(null);
  const glassRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<LiquidGlass | null>(null);
  const { webgl } = useGlassConfig();
  const webglRef = useRef(webgl);
  webglRef.current = webgl;

  // Decided on the client only, so the static HTML hydrates cleanly.
  useEffect(() => {
    setActive(wantsYbouaneGlass());
  }, []);

  // Boot the WebGL pipeline once the overlay exists.
  useEffect(() => {
    if (!active) return;
    const root = rootRef.current;
    const glass = glassRef.current;
    if (!root || !glass) return;

    let cancelled = false;
    void import("@ybouane/liquidglass").then(({ LiquidGlass }) => {
      if (cancelled || !root.isConnected) return;
      const cfg = toYbouaneConfig(webglRef.current);
      glass.dataset.config = JSON.stringify(cfg);
      return LiquidGlass.init({ root, glassElements: [glass], defaults: cfg }).then(
        (instance) => {
          if (cancelled) {
            instance.destroy();
            return;
          }
          instanceRef.current = instance;
        },
      );
    });

    return () => {
      cancelled = true;
      instanceRef.current?.destroy();
      instanceRef.current = null;
    };
  }, [active]);

  // Live tuner changes. ybouane watches data-config itself and re-shades.
  useEffect(() => {
    const glass = glassRef.current;
    if (!glass || !instanceRef.current) return;
    glass.dataset.config = JSON.stringify(toYbouaneConfig(webgl));
  }, [webgl]);

  // Follow the pill and keep the backdrop canvas fresh.
  useEffect(() => {
    if (!active) return;
    const root = rootRef.current;
    const backdrop = backdropRef.current;
    const glass = glassRef.current;
    const pill = document.getElementById(NAV_PILL_ID);
    if (!root || !backdrop || !glass || !pill) return;

    let raf = 0;
    let alive = true;
    let lastKey = "";
    let lastPaintAt = 0;

    const bump = () => {
      lastKey = "";
    };
    window.addEventListener("load", bump);
    const baseImg = document.querySelector("[data-nav-glass-base]");
    baseImg?.addEventListener("load", bump);

    const paint = () => {
      if (!alive) return;
      const rect = pill.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) {
        raf = requestAnimationFrame(paint);
        return;
      }

      const view = {
        left: rect.left - PAD,
        top: rect.top - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
      };
      root.style.left = `${view.left}px`;
      root.style.top = `${view.top}px`;
      root.style.width = `${view.width}px`;
      root.style.height = `${view.height}px`;
      glass.style.width = `${rect.width}px`;
      glass.style.height = `${rect.height}px`;
      root.style.setProperty("--ybouane-glass-blur", `${frostBlurPx(webglRef.current)}px`);

      const zoom = document.querySelector<HTMLElement>("[data-nav-glass-zoom]");
      const sun = document.querySelector<HTMLElement>("[data-nav-glass-sun]");
      const outro = document.querySelector<HTMLElement>("[data-nav-glass-outro]");
      const scroller = document.getElementById("page-scroller");
      const key = [
        Math.round(rect.left),
        Math.round(rect.top),
        Math.round(rect.width),
        Math.round(rect.height),
        zoom ? getComputedStyle(zoom).transform : "",
        sun ? Math.round(sun.getBoundingClientRect().top) : 0,
        outro ? getComputedStyle(outro).opacity : "",
        outro ? Math.round(outro.getBoundingClientRect().top) : 0,
        scroller ? Math.round(scroller.scrollTop) : 0,
      ].join(":");

      const now = performance.now();
      if (key !== lastKey && now - lastPaintAt >= MIN_REPAINT_MS) {
        lastKey = key;
        lastPaintAt = now;
        // Cap DPR — the backdrop paint is CPU-bound on phones.
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const overHero = paintHeroBehindPill(backdrop, view, dpr);
        if (!overHero) paintPageBehindPill(backdrop, view, dpr);
        instanceRef.current?.markChanged(backdrop);
      }

      raf = requestAnimationFrame(paint);
    };

    raf = requestAnimationFrame(paint);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("load", bump);
      baseImg?.removeEventListener("load", bump);
    };
  }, [active]);

  if (!active) return null;

  return (
    <div ref={rootRef} className={styles.root} data-ybouane-glass="" aria-hidden="true">
      <canvas ref={backdropRef} className={styles.backdrop} />
      <div
        ref={glassRef}
        className={styles.glass}
        style={{ left: PAD, top: PAD, borderRadius: YBOUANE_PILL_RADIUS }}
      />
    </div>
  );
}
