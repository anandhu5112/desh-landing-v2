"use client";

import { useEffect, useState } from "react";

import {
  useGlassConfig,
  type GlassConfig,
  type LensConfig,
  type PillChrome,
  type WebGlLensConfig,
} from "./GlassContext";
import { wantsYbouaneGlass } from "@/lib/ybouaneGlass";

/**
 * Dev-only slider panel for the nav glass.
 *
 * Temporarily mounted for preview tuning with ?tune=1. Remove the import and
 * mount from app/page.tsx before production; the query gate does not remove
 * it from the bundle. Two groups, because the effect is
 * two stacked things: the refraction the lens does to the page underneath,
 * and the pill's own chrome painted over it.
 */

/** [min, max, step] per control. */
const LENS_RANGES: Record<keyof LensConfig, [number, number, number]> = {
  // Fraction of the container — see LensConfig. Chrome uses this unscaled, as production.
  strength: [0, 0.05, 0.001],
  chromaticAberration: [0, 1, 0.05],
  blur: [0, 20, 0.5],
  depth: [0, 40, 1],
  curvature: [0, 1, 0.05],
  glow: [0, 1, 0.05],
  edgeHighlight: [0, 1, 0.05],
  specular: [0, 2, 0.05],
};

/* Safari / iOS lens — @ybouane/liquidglass's own knobs, see WebGlLensConfig.
   Shown in place of LENS_RANGES when that path is active: the SVG lens is not
   running there, so its sliders would move nothing on screen. */
const WEBGL_RANGES: Record<keyof WebGlLensConfig, [number, number, number]> = {
  refraction: [0, 2, 0.01],
  blurAmount: [0, 1, 0.01],
  chromAberration: [0, 0.5, 0.01],
  edgeHighlight: [0, 1, 0.01],
  specular: [0, 2, 0.05],
  fresnel: [0, 2, 0.05],
  zRadius: [1, 60, 1],
  saturation: [-1, 1, 0.05],
  brightness: [-0.5, 0.5, 0.01],
  distortion: [0, 1, 0.01],
};

/* Chrome production pill — blur/saturate/contrast drive .chromePill's
   backdrop-filter. Safari uses SAFARI_PILL_RANGES so those three cannot
   leak onto WebKit (cyan over the hero sky). */
const PILL_RANGES: Record<keyof GlassConfig, [number, number, number]> = {
  blur: [0, 40, 1],
  opacity: [0, 1, 0.02],
  saturate: [0, 3, 0.1],
  contrast: [0, 3, 0.1],
  rimLight: [0, 1, 0.05],
  shadowOpacity: [0, 1, 0.05],
};

const SAFARI_PILL_RANGES: Record<keyof PillChrome, [number, number, number]> = {
  opacity: [0, 1, 0.02],
  rimLight: [0, 1, 0.05],
  shadowOpacity: [0, 1, 0.05],
};

/* Layout only. The lens runs at every width, so all controls stay available. */
const NARROW_QUERY = "(max-width: 767px)";

function useIsNarrow() {
  // Starts false and corrects on mount: matchMedia does not exist while this
  // prerenders, and guessing wrong would render the lens group then tear it out.
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(NARROW_QUERY);
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return narrow;
}

function panelStyle(narrow: boolean): React.CSSProperties {
  return {
    position: "fixed",
    // Bottom-anchored on both: the pill being tuned is at the top of the
    // viewport, and the panel must never cover the thing it is changing.
    bottom: narrow ? "10px" : "20px",
    left: narrow ? "10px" : "20px",
    right: narrow ? "10px" : undefined,
    width: narrow ? undefined : "320px",
    maxHeight: narrow ? "46vh" : undefined,
    overflowY: narrow ? "auto" : undefined,
    background: "rgba(0,0,0,0.88)",
    color: "white",
    padding: narrow ? "12px 14px" : "14px 16px",
    borderRadius: "12px",
    zIndex: 9999,
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    fontFamily: "monospace",
    fontSize: narrow ? "13px" : "12px",
    // The panel sits over a page that owns the scroll; without this a drag that
    // starts on a slider scrolls the page instead of moving the thumb.
    touchAction: "none",
  };
}

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "8px",
};

const headingStyle: React.CSSProperties = {
  margin: "6px 0 2px",
  fontSize: "11px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  opacity: 0.55,
};

const buttonStyle: React.CSSProperties = {
  appearance: "none",
  border: "1px solid rgba(255,255,255,0.25)",
  background: "transparent",
  color: "white",
  fontFamily: "monospace",
  fontSize: "12px",
  borderRadius: "8px",
  padding: "6px 10px",
  cursor: "pointer",
};

function Slider({
  name,
  value,
  range: [min, max, step],
  narrow,
  onChange,
}: {
  name: string;
  value: number;
  range: [number, number, number];
  narrow: boolean;
  onChange: (value: number) => void;
}) {
  // Enough decimals to show a 0.001 step without printing 0.30000000000000004.
  const decimals = step < 0.01 ? 3 : step < 1 ? 2 : 0;
  return (
    <div style={rowStyle}>
      <label
        style={{
          width: narrow ? "88px" : "132px",
          flex: "none",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </label>
      <input
        aria-label={name}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          // Fills the row on a phone instead of the desktop's fixed 100px, and
          // gets a real touch target rather than a hairline.
          flex: narrow ? 1 : "none",
          width: narrow ? undefined : "100px",
          minWidth: 0,
          height: narrow ? "30px" : undefined,
        }}
      />
      <span style={{ width: narrow ? "42px" : "48px", flex: "none", textAlign: "right" }}>
        {value.toFixed(decimals)}
      </span>
    </div>
  );
}

export default function GlassTuner() {
  const { config, setConfig, safariPill, setSafariPill, lens, setLens, webgl, setWebgl } =
    useGlassConfig();
  const narrow = useIsNarrow();
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  // Inert unless the URL asks for it, the same gate ScrollProbe uses. Being
  // mounted is not the same as being visible: this way a tuning build that gets
  // promoted by accident still shows a visitor nothing. Read in an effect
  // rather than at render because the page is prerendered to static HTML.
  const [enabled, setEnabled] = useState(false);
  // Which lens is live on this engine — decides which group of sliders to show.
  const [webglLens, setWebglLens] = useState(false);
  useEffect(() => {
    setEnabled(new URLSearchParams(window.location.search).get("tune") === "1");
    setWebglLens(wantsYbouaneGlass());
  }, []);

  // Shaped to paste straight over the defaults in GlassContext, because reading
  // six numbers off a phone screen and retyping them is how values drift.
  const snippet = webglLens
    ? [
        "// GlassProvider safariPill (Safari / iOS only)",
        ...(Object.keys(SAFARI_PILL_RANGES) as (keyof PillChrome)[]).map(
          (key) => `${key}: ${safariPill[key]},`,
        ),
        "// GlassProvider webgl",
        ...(Object.keys(WEBGL_RANGES) as (keyof WebGlLensConfig)[]).map(
          (key) => `${key}: ${webgl[key]},`,
        ),
      ].join("\n")
    : [
        "// GlassProvider config",
        ...(Object.keys(PILL_RANGES) as (keyof GlassConfig)[]).map(
          (key) => `${key}: ${config[key]},`,
        ),
        "// GlassProvider lens",
        ...(Object.keys(LENS_RANGES) as (keyof LensConfig)[]).map(
          (key) => `${key}: ${lens[key]},`,
        ),
      ].join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access is gated on some mobile browsers; the values are on
      // screen either way, so this is a convenience, not the only route out.
      setCopied(false);
    }
  };

  if (!enabled) return null;

  return (
    <div style={panelStyle(narrow)}>
      <div style={rowStyle}>
        <h3 style={{ margin: 0, fontSize: "13px" }}>Nav Glass</h3>
        <button type="button" style={buttonStyle} onClick={() => setOpen((v) => !v)}>
          {open ? "hide" : "show"}
        </button>
      </div>

      {open && (
        <>
          {webglLens ? (
            <>
              <p style={headingStyle}>WebGL lens (Safari / iOS)</p>
              {(Object.keys(WEBGL_RANGES) as (keyof WebGlLensConfig)[]).map((key) => (
                <Slider
                  key={key}
                  name={key}
                  value={webgl[key]}
                  range={WEBGL_RANGES[key]}
                  narrow={narrow}
                  onChange={(value) => setWebgl((prev) => ({ ...prev, [key]: value }))}
                />
              ))}
            </>
          ) : (
            <>
              <p style={headingStyle}>Lens (refracts the page)</p>
              {(Object.keys(LENS_RANGES) as (keyof LensConfig)[]).map((key) => (
                <Slider
                  key={key}
                  name={key}
                  value={lens[key]}
                  range={LENS_RANGES[key]}
                  narrow={narrow}
                  onChange={(value) => setLens((prev) => ({ ...prev, [key]: value }))}
                />
              ))}
            </>
          )}
          <p style={headingStyle}>
            {webglLens ? "Pill (Safari / iOS only)" : "Pill (drawn on top)"}
          </p>

          {webglLens
            ? (Object.keys(SAFARI_PILL_RANGES) as (keyof PillChrome)[]).map((key) => (
                <Slider
                  key={key}
                  name={key}
                  value={safariPill[key]}
                  range={SAFARI_PILL_RANGES[key]}
                  narrow={narrow}
                  onChange={(value) => setSafariPill((prev) => ({ ...prev, [key]: value }))}
                />
              ))
            : (Object.keys(PILL_RANGES) as (keyof GlassConfig)[]).map((key) => (
                <Slider
                  key={key}
                  name={key}
                  value={config[key]}
                  range={PILL_RANGES[key]}
                  narrow={narrow}
                  onChange={(value) => setConfig((prev) => ({ ...prev, [key]: value }))}
                />
              ))}

          <button type="button" style={{ ...buttonStyle, marginTop: "6px" }} onClick={copy}>
            {copied ? "copied ✓" : "copy values"}
          </button>
        </>
      )}
    </div>
  );
}
