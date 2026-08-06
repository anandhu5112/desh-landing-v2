import type Lenis from "lenis";

/**
 * The page's single Lenis instance, set by SmoothScroll on mount and cleared
 * on unmount. A plain mutable ref rather than context: consumers (like
 * useSnapIntoView) are one-off effects, not components that need to
 * re-render when it changes.
 */
export const lenisRef: { current: Lenis | null } = { current: null };
