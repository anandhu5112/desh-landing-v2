"use client";

import { useGlassConfig, type GlassConfig, type LensConfig } from "./GlassContext";

/**
 * Dev-only slider panel for the nav glass.
 *
 * NOT mounted by the app — see the note where it used to sit in app/page.tsx.
 * It is imported nowhere on purpose: a NODE_ENV branch still left the whole
 * component in the production bundle, and these sliders must never reach a
 * visitor. Mount it by hand while tuning, then take it back out. Two groups, because the effect is
 * two stacked things: the refraction the lens does to the page underneath,
 * and the pill's own chrome painted over it.
 */

/** [min, max, step] per control. */
const LENS_RANGES: Record<keyof LensConfig, [number, number, number]> = {
  // Fraction of the viewport, so the useful range is tiny — see LensConfig.
  strength: [0, 0.05, 0.001],
  chromaticAberration: [0, 1, 0.05],
  blur: [0, 20, 0.5],
  depth: [0, 40, 1],
  curvature: [0, 1, 0.05],
  glow: [0, 1, 0.05],
  edgeHighlight: [0, 1, 0.05],
  specular: [0, 2, 0.05],
};

const PILL_RANGES: Record<keyof GlassConfig, [number, number, number]> = {
  blur: [0, 40, 1],
  opacity: [0, 1, 0.02],
  saturate: [0, 3, 0.1],
  contrast: [0, 3, 0.1],
  rimLight: [0, 1, 0.05],
  shadowOpacity: [0, 1, 0.05],
};

const panelStyle: React.CSSProperties = {
  position: "fixed",
  bottom: "20px",
  left: "20px",
  background: "rgba(0,0,0,0.82)",
  color: "white",
  padding: "14px 16px",
  borderRadius: "12px",
  zIndex: 9999,
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  fontFamily: "monospace",
  fontSize: "12px",
  width: "320px",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "8px",
};

const labelStyle: React.CSSProperties = {
  width: "132px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const headingStyle: React.CSSProperties = {
  margin: "6px 0 2px",
  fontSize: "11px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  opacity: 0.55,
};

function Slider({
  name,
  value,
  range: [min, max, step],
  onChange,
}: {
  name: string;
  value: number;
  range: [number, number, number];
  onChange: (value: number) => void;
}) {
  // Enough decimals to show a 0.001 step without printing 0.30000000000000004.
  const decimals = step < 0.01 ? 3 : step < 1 ? 2 : 0;
  return (
    <div style={rowStyle}>
      <label style={labelStyle}>{name}</label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100px" }}
      />
      <span style={{ width: "48px", textAlign: "right" }}>{value.toFixed(decimals)}</span>
    </div>
  );
}

export default function GlassTuner() {
  const { config, setConfig, lens, setLens } = useGlassConfig();

  return (
    <div style={panelStyle}>
      <h3 style={{ margin: 0, fontSize: "13px" }}>Nav Glass</h3>

      <p style={headingStyle}>Lens (refracts the page)</p>
      {(Object.keys(LENS_RANGES) as (keyof LensConfig)[]).map((key) => (
        <Slider
          key={key}
          name={key}
          value={lens[key]}
          range={LENS_RANGES[key]}
          onChange={(value) => setLens((prev) => ({ ...prev, [key]: value }))}
        />
      ))}

      <p style={headingStyle}>Pill (drawn on top)</p>
      {(Object.keys(PILL_RANGES) as (keyof GlassConfig)[]).map((key) => (
        <Slider
          key={key}
          name={key}
          value={config[key]}
          range={PILL_RANGES[key]}
          onChange={(value) => setConfig((prev) => ({ ...prev, [key]: value }))}
        />
      ))}
    </div>
  );
}
