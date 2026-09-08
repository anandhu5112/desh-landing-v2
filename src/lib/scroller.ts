/**
 * The page scrolls inside a div, not the window.
 *
 * This exists for the liquid-glass nav: the glass filter refracts its own
 * children, so the page has to live *inside* a viewport-sized filtered
 * element. Filtering the whole ~8,000px document instead blows the GPU's
 * texture limit and renders everything past the first screen black — the
 * filter region is the whole element regardless of how small the lens is.
 * A fixed, exactly-viewport-sized container never hits that ceiling no
 * matter how long the page gets.
 */

/** Set by ScrollRoot on the element that actually scrolls. */
export const SCROLLER_ID = "page-scroller";

/** Its single child, wrapping the whole page. */
export const SCROLL_CONTENT_ID = "page-scroll-content";

/**
 * Looked up by id rather than handed round as a ref, because the earliest
 * consumer is a *descendant*: Hero creates its pinned ScrollTrigger in a
 * layout effect, and React attaches a parent's callback ref only after every
 * descendant's layout effect has already run. A ref would still be null
 * there, and ScrollTrigger would quietly fall back to watching window scroll
 * — which never moves once the page lives in here, so the hero would pin at
 * the top and never release. The DOM node itself is in the document from the
 * commit's mutation phase, so an id lookup is correct from anywhere.
 */
export function getScroller(): HTMLElement | null {
  return document.getElementById(SCROLLER_ID);
}

/**
 * Lenis needs this as well as the scroller: `wrapper` is what scrolls,
 * `content` is what it measures to know how far it can.
 */
export function getScrollContent(): HTMLElement | null {
  return document.getElementById(SCROLL_CONTENT_ID);
}
