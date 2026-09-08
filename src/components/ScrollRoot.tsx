"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { LiquidGlass, type LiquidGlassHandle } from "liquid-glass-web-react";
import { SCROLLER_ID, SCROLL_CONTENT_ID } from "@/lib/scroller";
import { NAV_PILL_ID, useGlassConfig } from "./GlassContext";
import styles from "./ScrollRoot.module.css";

/** Matches .pill's border-radius in SiteNav.module.css. */
const PILL_RADIUS = 16;

/** Only used for the first frame, before the pill has been measured. */
const INITIAL_LENS_SIZE = { width: 420, height: 56 };

/**
 * Wraps the page in the glass surface and its scroll container.
 *
 * <LiquidGlass> refracts its own *children* — it is a `filter`, not a
 * `backdrop-filter` — so the page has to live inside it. It is pinned at
 * `inset: 0`, which is the whole point: the filter's raster is one viewport
 * no matter how long the page gets. Filtering the full ~8,000px document
 * instead exceeds the GPU texture limit and paints everything past the first
 * screen black.
 *
 * The library needs a patch to work here at all, kept in
 * patches/liquid-glass-web-react+0.1.1.patch. Upstream only uses
 * userSpaceOnUse filter units on iOS and leaves everyone else on
 * objectBoundingBox — and on that path Chrome stops displacing entirely once
 * the filtered element's child is a scroll container, which is precisely how
 * this is built. Measured at identical geometry and content: 9.03 mean
 * channel delta with a static child, 0.48 with an overflow:auto one. The
 * patch forces userSpaceOnUse everywhere, which is platform-neutral (both
 * paths compute in px) and gives Chrome and WebKit the same working path.
 *
 * Only page sections belong in here. SiteNav, the contact modal and
 * GlassTuner are siblings outside it — chrome that draws over the refraction
 * rather than through it. See lib/scroller.ts for the scrolling half of this.
 */
export default function ScrollRoot({ children }: { children: ReactNode }) {
  const glassRef = useRef<LiquidGlassHandle | null>(null);
  const { lens } = useGlassConfig();
  const [lensSize, setLensSize] = useState(INITIAL_LENS_SIZE);

  // Keep the lens sitting exactly under the nav pill. The pill is fixed and
  // no longer hides on scroll, so its box only changes on a resize or when
  // the mobile menu grows it — no scroll tracking and no per-frame layout
  // read. A ResizeObserver covers the menu, including every frame of its
  // width/height transition.
  useEffect(() => {
    const pill = document.getElementById(NAV_PILL_ID);
    if (!pill) return;

    let lastX = -1;
    let lastY = -1;
    let lastWidth = -1;
    let lastHeight = -1;

    const measure = () => {
      const rect = pill.getBoundingClientRect();
      if (rect.width === 0) return;

      // The glass surface is fixed at inset 0, so its box is the viewport.
      // Position goes through the imperative handle: it only shifts the
      // filter's lens subregion and never regenerates the displacement map.
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;
      if (x !== lastX || y !== lastY) {
        lastX = x;
        lastY = y;
        glassRef.current?.setPosition(x, y);
      }

      // Size is a *shape* change, which does regenerate the map — so it goes
      // through state, and only when the rounded value actually moves.
      const width = Math.round(rect.width);
      const height = Math.round(rect.height);
      if (width !== lastWidth || height !== lastHeight) {
        lastWidth = width;
        lastHeight = height;
        setLensSize({ width, height });
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(pill);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <LiquidGlass
      ref={glassRef}
      className={styles.glass}
      // Inline, not in the stylesheet: the library writes `position: relative`
      // as an inline style and spreads this over it, so a class would lose.
      style={{ position: "fixed", inset: 0 }}
      // The pill draws its own rim and shadow; a second one on the lens
      // double-prints the edge.
      shadow={false}
      radius={PILL_RADIUS}
      width={lensSize.width}
      height={lensSize.height}
      strength={lens.strength}
      chromaticAberration={lens.chromaticAberration}
      blur={lens.blur}
      depth={lens.depth}
      curvature={lens.curvature}
      glow={lens.glow}
      edgeHighlight={lens.edgeHighlight}
      specular={lens.specular}
    >
      <div id={SCROLLER_ID} className={styles.scroller}>
        <div id={SCROLL_CONTENT_ID} className={styles.content}>
          {children}
        </div>
      </div>
    </LiquidGlass>
  );
}
