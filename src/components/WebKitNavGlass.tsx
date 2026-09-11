"use client";

import { useEffect, useRef, useState } from "react";
import { NAV_PILL_ID, useGlassConfig } from "./GlassContext";
import {
  needsWebKitGlassFallback,
  paintHeroBehindPill,
  refractLensToCanvas,
} from "@/lib/webkitGlass";
import { wantsYbouaneGlass } from "@/lib/ybouaneGlass";
import styles from "./WebKitNavGlass.module.css";

const PILL_RADIUS = 16;
const PAD = 40;

/**
 * WebKit nav glass — pill-sized canvas refraction (legacy fallback).
 *
 * Default Safari / iOS now uses @ybouane/liquidglass via YbouaneNavGlass.
 * This canvas path stays for ?glass=canvas comparison, and is inert otherwise.
 *
 * Intentionally "good refraction," not Chrome-identical. Live-DOM SVG and a
 * reconstructed canvas will never match pixel-for-pixel — stop chasing parity.
 */
export default function WebKitNavGlass() {
  const [active] = useState(
    () => needsWebKitGlassFallback() && !wantsYbouaneGlass(),
  );
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceRef = useRef<HTMLCanvasElement | null>(null);
  const { lens } = useGlassConfig();
  const lensRef = useRef(lens);
  lensRef.current = lens;

  useEffect(() => {
    if (!active) return;
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const pill = document.getElementById(NAV_PILL_ID);
    if (!host || !canvas || !pill) return;

    let raf = 0;
    let alive = true;
    let lastKey = "";
    let lastRefractAt = 0;
    if (!sourceRef.current) sourceRef.current = document.createElement("canvas");

    // First decode of sky/landscape should force a refract pass.
    const bump = () => {
      lastKey = "";
    };
    window.addEventListener("load", bump);
    document.querySelector("[data-nav-glass-base]")?.addEventListener("load", bump);

    const paint = () => {
      if (!alive) return;
      const rect = pill.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) {
        raf = requestAnimationFrame(paint);
        return;
      }

      host.style.left = `${rect.left}px`;
      host.style.top = `${rect.top}px`;
      host.style.width = `${rect.width}px`;
      host.style.height = `${rect.height}px`;
      host.style.setProperty("--webkit-glass-blur", `${lensRef.current.blur}px`);

      // Cap DPR — refraction is CPU-bound on phones.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const view = {
        left: rect.left - PAD,
        top: rect.top - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
      };

      const source = sourceRef.current!;
      const overHero = paintHeroBehindPill(source, view, dpr);

      if (!overHero) {
        host.classList.add(styles.frost);
        canvas.style.opacity = "0";
        lastKey = "frost";
        raf = requestAnimationFrame(paint);
        return;
      }

      host.classList.remove(styles.frost);
      canvas.style.opacity = "1";

      const l = lensRef.current;
      const zoom = document.querySelector<HTMLElement>("[data-nav-glass-zoom]");
      const sun = document.querySelector<HTMLElement>("[data-nav-glass-sun]");
      const zoomT = zoom ? getComputedStyle(zoom).transform : "";
      const sunT = sun ? Math.round(sun.getBoundingClientRect().top) : 0;
      const key = [
        Math.round(rect.left),
        Math.round(rect.top),
        Math.round(rect.width),
        Math.round(rect.height),
        Math.round(view.top),
        zoomT,
        sunT,
        l.strength,
        l.blur,
        l.chromaticAberration,
        l.depth,
        l.curvature,
        l.glow,
        l.edgeHighlight,
        l.specular,
      ].join(":");

      const now = performance.now();
      // Cap at ~30fps while the sunrise is moving; skip identical parked frames.
      if (key !== lastKey && now - lastRefractAt >= 32) {
        lastKey = key;
        lastRefractAt = now;
        refractLensToCanvas(source, canvas, {
          width: rect.width,
          height: rect.height,
          radius: PILL_RADIUS,
          strength: l.strength,
          chromaticAberration: l.chromaticAberration,
          blur: l.blur,
          depth: l.depth,
          curvature: l.curvature,
          glow: l.glow,
          edgeHighlight: l.edgeHighlight,
          specular: l.specular,
          pad: PAD,
          dpr,
        });
      }

      raf = requestAnimationFrame(paint);
    };

    raf = requestAnimationFrame(paint);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("load", bump);
    };
  }, [active, lens]);

  if (!active) return null;

  return (
    <div ref={hostRef} className={styles.host} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  );
}
