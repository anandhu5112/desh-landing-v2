/** Desktop reference documented in GlassContext when the lens was tuned. */
const REFERENCE_DIAGONAL = Math.hypot(1440, 900);

/**
 * The library multiplies strength by the filtered surface's diagonal.
 * Cancel that scaling so the same knob produces the same CSS-pixel
 * refraction on a phone, in landscape, and on the reference desktop.
 */
export function glassStrengthScale(width: number, height: number): number {
  if (width <= 0 || height <= 0 || !Number.isFinite(width + height)) return 1;
  return REFERENCE_DIAGONAL / Math.hypot(width, height);
}
