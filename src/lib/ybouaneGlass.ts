import type { GlassConfig as YbouaneConfig } from "@ybouane/liquidglass";
import type { WebGlLensConfig } from "@/components/GlassContext";
import { needsWebKitGlassFallback } from "./webkitGlass";

/** Query key for glass backend overrides. */
export const YBOUANE_GLASS_QUERY = "glass";

/** Matches .pill's border-radius in SiteNav.module.css. */
export const YBOUANE_PILL_RADIUS = 16;

/**
 * Safari / iOS cannot run liquid-glass-web-react's full-page SVG filter
 * (feImage is a no-op). @ybouane/liquidglass is the WebKit glass path.
 *
 * Blink keeps liquid-glass-web-react unless forced with ?glass=webgl.
 * ?glass=canvas restores the old WebKitNavGlass canvas fallback for A/B.
 */
export function wantsYbouaneGlass(
  search?: string,
  isWebKit?: boolean,
): boolean {
  const q =
    search ??
    (typeof window !== "undefined" ? window.location.search : "");
  const webkit =
    isWebKit ??
    (typeof navigator !== "undefined" ? needsWebKitGlassFallback() : false);
  const params = new URLSearchParams(q.startsWith("?") ? q.slice(1) : q);
  const mode = params.get(YBOUANE_GLASS_QUERY);
  if (mode === "canvas") return false;
  if (mode === "webgl") return true;
  return webkit;
}

/**
 * The tuner's knobs plus the fixed parts. Shadow, tint and darkening stay
 * at zero: the pill's own CSS draws its scrim, rim and drop shadow over the
 * refraction, exactly as on Blink, so the shader must not double them.
 */
export function toYbouaneConfig(webgl: WebGlLensConfig): Partial<YbouaneConfig> {
  return {
    ...webgl,
    cornerRadius: YBOUANE_PILL_RADIUS,
    tintStrength: 0,
    shadowOpacity: 0,
    opacity: 1,
    floating: false,
    button: false,
    bevelMode: 0,
  };
}

/** Frost blur (CSS px) used below the hero, where there is nothing to refract. */
export function frostBlurPx(webgl: WebGlLensConfig): number {
  return Math.round(webgl.blurAmount * 20 * 10) / 10;
}
