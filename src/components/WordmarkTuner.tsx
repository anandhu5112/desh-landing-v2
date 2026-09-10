"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { WORDMARK_ID } from "./Footer";

/**
 * Dev-only slider panel for the footer's glass wordmark — and only for that.
 * The nav pill has its own, GlassTuner, driven by React state through
 * GlassContext; this one cannot work the same way, because the wordmark is
 * pure CSS with no state behind it and is meant to stay that way. So it
 * writes the same --wm-* custom properties Footer.module.css declares
 * straight onto the element, and the cascade does the rest. Nothing in the
 * shipped footer knows this exists.
 *
 * NOT mounted by the app — see the note where it would go in app/page.tsx,
 * which also has the one line that brings it back. Mount it by hand while
 * tuning, press Copy CSS, paste the block over the --wm-* defaults in
 * Footer.module.css, bring WORDMARK_DEFAULTS below into line with it (a test
 * holds the two together), then take the mount out again.
 *
 * The rim's *width* is not here: it lives in the stroke-width of
 * public/images/desh-wordmark-rim.svg, because it is cut into the mask
 * rather than drawn. Change it there and reload.
 */

/** [min, max, step], and the default that Footer.module.css declares. */
type Control = { range: [number, number, number]; value: number };

const GROUPS: { heading: string; note: string; controls: Record<string, Control> }[] = [
  {
    heading: "Body",
    note: "the scene seen through the glass",
    controls: {
      "body-scale": { range: [1, 1.5, 0.01], value: 1 },
      "body-blur": { range: [0, 0.06, 0.002], value: 0.012 },
      "body-saturate": { range: [0.5, 2.5, 0.05], value: 1.5 },
      "body-brightness": { range: [0.7, 1.6, 0.02], value: 1 },
    },
  },
  {
    heading: "Edge",
    note: "the rim band, bent harder",
    controls: {
      "edge-scale": { range: [1, 2.5, 0.05], value: 1.45 },
      "edge-blur": { range: [0, 0.06, 0.002], value: 0.004 },
      "edge-saturate": { range: [0.5, 2.5, 0.05], value: 1.5 },
      "edge-brightness": { range: [0.7, 1.6, 0.02], value: 1.04 },
    },
  },
  {
    heading: "Light",
    note: "153deg matches the scene's own sun",
    controls: {
      "light-angle": { range: [0, 360, 1], value: 153 },
      tint: { range: [0, 0.5, 0.01], value: 0 },
      bevel: { range: [0, 1, 0.02], value: 0.2 },
    },
  },
  {
    heading: "Shadow",
    note: "lifts the letters off the grass",
    controls: {
      shadow: { range: [0, 0.8, 0.02], value: 0.52 },
      "shadow-blur": { range: [0, 0.2, 0.004], value: 0.1 },
      "shadow-offset": { range: [0, 0.12, 0.002], value: 0.046 },
    },
  },
];

/** Only this one carries a unit; the rest are bare numbers. */
const ANGLE = "light-angle";

export const WORDMARK_DEFAULTS: Record<string, number> = Object.fromEntries(
  GROUPS.flatMap((g) => Object.entries(g.controls).map(([key, c]) => [key, c.value])),
);

const format = (key: string, value: number) => {
  const step = GROUPS.flatMap((g) => Object.entries(g.controls)).find(([k]) => k === key)![1]
    .range[2];
  const decimals = step < 0.01 ? 3 : step < 1 ? 2 : 0;
  return value.toFixed(decimals) + (key === ANGLE ? "deg" : "");
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

const buttonStyle: React.CSSProperties = {
  flex: 1,
  padding: "6px 8px",
  background: "rgba(255,255,255,0.12)",
  color: "inherit",
  border: "1px solid rgba(255,255,255,0.25)",
  borderRadius: "6px",
  font: "inherit",
  cursor: "pointer",
};

export default function WordmarkTuner() {
  const [values, setValues] = useState<Record<string, number>>(WORDMARK_DEFAULTS);
  const [copyLabel, setCopyLabel] = useState("Copy CSS");
  const missingRef = useRef(false);

  // Straight onto the element, every render: the wordmark is CSS-only and
  // has no React state to feed.
  useEffect(() => {
    const el = document.getElementById(WORDMARK_ID);
    if (!el) {
      // Scroll down — it is only in the DOM once the footer has mounted.
      missingRef.current = true;
      return;
    }
    missingRef.current = false;
    for (const [key, value] of Object.entries(values)) {
      el.style.setProperty(`--wm-${key}`, format(key, value));
    }
  }, [values]);

  const copy = useCallback(() => {
    const block = GROUPS.map((group) =>
      Object.keys(group.controls)
        .map((key) => `  --wm-${key}: ${format(key, values[key])};`)
        .join("\n"),
    ).join("\n\n");
    // The clipboard is refused often enough — an unfocused document, a
    // non-secure origin — that swallowing the rejection would leave the
    // panel looking like it had worked. The console always gets the block,
    // so the values are never actually lost.
    const settle = (label: string) => {
      setCopyLabel(label);
      setTimeout(() => setCopyLabel("Copy CSS"), 1600);
    };
    navigator.clipboard.writeText(block).then(
      () => settle("Copied"),
      () => {
        console.info("[WordmarkTuner] clipboard refused; paste this instead:\n" + block);
        settle("See console");
      },
    );
  }, [values]);

  const reset = useCallback(() => {
    const el = document.getElementById(WORDMARK_ID);
    for (const key of Object.keys(WORDMARK_DEFAULTS)) el?.style.removeProperty(`--wm-${key}`);
    setValues(WORDMARK_DEFAULTS);
  }, []);

  return (
    <div style={panelStyle}>
      <h3 style={{ margin: 0, fontSize: "13px" }}>Desh Wordmark Glass</h3>

      {GROUPS.map((group) => (
        <div key={group.heading}>
          <p style={headingStyle}>
            {group.heading}: {group.note}
          </p>
          {Object.entries(group.controls).map(([key, { range: [min, max, step] }]) => (
            <div key={key} style={rowStyle}>
              <label style={labelStyle}>{key}</label>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={values[key]}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [key]: parseFloat(e.target.value) }))
                }
                style={{ width: "100px" }}
              />
              <span style={{ width: "56px", textAlign: "right" }}>{format(key, values[key])}</span>
            </div>
          ))}
        </div>
      ))}

      <div style={{ ...rowStyle, marginTop: "10px" }}>
        <button type="button" style={buttonStyle} onClick={copy}>
          {copyLabel}
        </button>
        <button type="button" style={buttonStyle} onClick={reset}>
          Reset
        </button>
      </div>
    </div>
  );
}
