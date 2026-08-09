// Design-verification capture script — Playwright, headless Chromium.
// Produces screenshots + measurements.json for design-handoff/.
//
// Run: node design-handoff/capture.mjs
// Requires the dev server running at http://localhost:3000.

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "screenshots");
const BASE_URL = "http://localhost:3000/";
const VIEWPORT = { width: 1440, height: 900 };

// The grid the site actually implements: 12 columns, 24px margins, 20px
// gutters. The 24px margin is a deliberate call — Figma's own grid for this
// page specifies 32px, which read as too heavy in the build. The overlay
// tracks the implementation so these screenshots verify alignment against
// the system in use rather than against a spec that was consciously changed.
const GRID = { columns: 12, margin: 24, gutter: 20 };

mkdirSync(OUT_DIR, { recursive: true });

function gridColumnEdges(pageWidth) {
  const contentWidth = pageWidth - GRID.margin * 2;
  const colWidth =
    (contentWidth - GRID.gutter * (GRID.columns - 1)) / GRID.columns;
  const edges = [];
  for (let i = 0; i < GRID.columns; i++) {
    const x = GRID.margin + i * (colWidth + GRID.gutter);
    edges.push({ index: i, start: Math.round(x * 10) / 10 });
  }
  return {
    colWidth: Math.round(colWidth * 100) / 100,
    edges,
    contentRightEdge: pageWidth - GRID.margin,
  };
}

async function injectGridOverlay(page) {
  await page.evaluate(
    ({ columns, margin, gutter }) => {
      const old = document.getElementById("__design_grid_overlay__");
      if (old) old.remove();
      const overlay = document.createElement("div");
      overlay.id = "__design_grid_overlay__";
      overlay.style.position = "absolute";
      overlay.style.top = "0";
      overlay.style.left = "0";
      overlay.style.width = "100%";
      overlay.style.height = document.documentElement.scrollHeight + "px";
      overlay.style.zIndex = "2147483647";
      overlay.style.pointerEvents = "none";
      overlay.style.display = "flex";
      overlay.style.justifyContent = "center";

      const inner = document.createElement("div");
      inner.style.width = "100%";
      inner.style.maxWidth = "100%";
      inner.style.height = "100%";
      inner.style.paddingLeft = margin + "px";
      inner.style.paddingRight = margin + "px";
      inner.style.display = "flex";
      inner.style.gap = gutter + "px";
      inner.style.boxSizing = "border-box";

      for (let i = 0; i < columns; i++) {
        const col = document.createElement("div");
        col.style.flex = "1 1 0";
        col.style.height = "100%";
        col.style.background = "rgba(255, 0, 128, 0.12)";
        col.style.outline = "1px solid rgba(255, 0, 128, 0.5)";
        inner.appendChild(col);
      }
      overlay.appendChild(inner);
      document.body.appendChild(overlay);
    },
    GRID
  );
}

async function removeGridOverlay(page) {
  await page.evaluate(() => {
    const old = document.getElementById("__design_grid_overlay__");
    if (old) old.remove();
  });
}

async function shootLocator(page, locator, filePath) {
  await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  await locator.screenshot({ path: filePath });
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
  });

  // Deterministic, static end-state screenshots — every scroll-reveal and
  // video autoplay in this codebase is explicitly gated behind
  // prefers-reduced-motion, so this settles the whole page into its final
  // visual state instead of catching mid-animation frames.
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.goto(BASE_URL, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);

  // next/image lazy-loads below-the-fold art (the footer's hills scene, the
  // section videos). A fullPage screenshot does NOT reliably trigger those
  // loads, which silently produced a solid-black footer in earlier runs of
  // this script. Walk the whole page once so every image decodes, then
  // return to the top before any capture happens.
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForFunction(
    () => [...document.images].every((img) => img.complete),
    null,
    { timeout: 15000 }
  );
  await page.waitForTimeout(400);

  const sections = {
    nav: page.locator("header"),
    hero: page.locator("main"),
    usSection: page.locator("section", { hasText: "Invest beyond borders" }),
    advisorSection: page.locator("section", { hasText: "Real Advisors" }),
    growSection: page.locator("section", { hasText: "Grow your wealth in India" }),
    bloomSection: page.locator("#wealth-bloom"),
    // The rounded, page-margin-inset boxes themselves — the <section>
    // wrappers around them stay full-bleed, so measuring only those would
    // report 0px radius and miss the treatment entirely.
    advisorFrame: page.locator('section [class*="frame"]').first(),
    bloomDarkBox: page.locator('#wealth-bloom [class*="darkBox"]'),
    // The portfolio CTA and WhatsApp card moved out of the footer's white
    // card and into BloomSection's continuous dark panel (Figma 379:15555).
    whatsappCard: page.locator('#wealth-bloom [class*="whatsappCard"]'),
    faqSection: page.locator("section", { hasText: "Frequently Asked Questions" }),
    faqCard: page.locator('[class*="FaqSection"][class*="item"]').first(),
    footer: page.locator("footer"),
    footerBar: page.locator('footer [class*="bar"]').first(),
  };

  // ---------- Full page ----------
  await page.screenshot({
    path: path.join(OUT_DIR, "full-page.png"),
    fullPage: true,
  });

  await injectGridOverlay(page);
  await page.screenshot({
    path: path.join(OUT_DIR, "full-page-grid.png"),
    fullPage: true,
  });
  await removeGridOverlay(page);

  // ---------- Per-section ----------
  // 01: nav + hero together, from page top through Hero's own bottom edge.
  const heroBottom = await sections.hero.evaluate(
    (el) => el.getBoundingClientRect().bottom + window.scrollY
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
  await page.screenshot({
    path: path.join(OUT_DIR, "01-nav-hero.png"),
    clip: { x: 0, y: 0, width: VIEWPORT.width, height: Math.ceil(heroBottom) },
  });
  await injectGridOverlay(page);
  await page.screenshot({
    path: path.join(OUT_DIR, "01-nav-hero-grid.png"),
    clip: { x: 0, y: 0, width: VIEWPORT.width, height: Math.ceil(heroBottom) },
  });
  await removeGridOverlay(page);

  const perSection = [
    ["02-invest-beyond-borders", sections.usSection],
    ["03-real-advisors", sections.advisorSection],
    ["04-grow-wealth-india", sections.growSection],
    ["05-wealth-grows-calculator", sections.bloomSection],
    ["06-portfolio-whatsapp", sections.whatsappCard],
    ["07-faq", sections.faqSection],
    ["08-footer", sections.footerBar],
  ];

  for (const [name, locator] of perSection) {
    const count = await locator.count();
    if (count === 0) {
      console.warn(`[capture] SKIPPED ${name}: locator matched 0 elements`);
      continue;
    }
    const target = count > 1 ? locator.first() : locator;
    await shootLocator(page, target, path.join(OUT_DIR, `${name}.png`));
    await injectGridOverlay(page);
    await page.waitForTimeout(100);
    await shootLocator(page, target, path.join(OUT_DIR, `${name}-grid.png`));
    await removeGridOverlay(page);
  }

  // ---------- Measurements ----------
  // Resolved and measured one target at a time, each freshly scrolled into
  // view first — getBoundingClientRect() is viewport-relative, and a
  // single batch pass at one arbitrary final scroll position produced two
  // real bugs on the first attempt: (1) position:fixed elements (the nav)
  // got window.scrollY wrongly added on top of their already-fixed
  // viewport position, and (2) the three plain <section> elements resolved
  // to whichever one document.querySelector('section') happened to hit
  // first, since a same-tag selector always "succeeds" before any
  // text-based fallback logic runs. Both are avoided by locating each
  // target by unique heading text (not a shared tag) and re-measuring
  // it in its own clean, single-target scroll state.
  function resolverFor(key) {
    switch (key) {
      case "nav":
        return `document.querySelector("header")`;
      case "hero":
        return `document.querySelector("main")`;
      case "usSection":
        return `[...document.querySelectorAll("section")].find(s => s.textContent.includes("Invest beyond borders"))`;
      case "advisorSection":
        return `[...document.querySelectorAll("section")].find(s => s.textContent.includes("Real Advisors"))`;
      case "growSection":
        return `[...document.querySelectorAll("section")].find(s => s.textContent.includes("Grow your wealth in India"))`;
      case "bloomSection":
        return `document.querySelector("#wealth-bloom")`;
      case "footer":
        return `document.querySelector("footer")`;
      case "advisorFrame":
        return `[...document.querySelectorAll("section")].find(s => s.textContent.includes("Real Advisors")).querySelector('[class*="frame"]')`;
      case "bloomDarkBox":
        return `document.querySelector('#wealth-bloom [class*="darkBox"]')`;
      case "faqCard":
        return `document.querySelector('[class*="FaqSection"][class*="item"]')`;
      case "whatsappCard":
        return `document.querySelector('#wealth-bloom [class*="whatsappCard"]')`;
      case "faqSection":
        return `[...document.querySelectorAll("section")].find(s => s.textContent.includes("Frequently Asked Questions"))`;
      case "footerBar":
        return `document.querySelector('footer [class*="bar"]')`;
      default:
        throw new Error(`no resolver for ${key}`);
    }
  }

  const gridGeom = gridColumnEdges(VIEWPORT.width);
  const measurements = {
    grid: {
      pageWidth: VIEWPORT.width,
      marginLeft: GRID.margin,
      marginRight: GRID.margin,
      columnWidth: gridGeom.colWidth,
      gutterWidth: GRID.gutter,
      columnEdgesX: gridGeom.edges,
      contentRightEdge: gridGeom.contentRightEdge,
    },
    sections: {},
  };

  const measureFn = (resolverSrc) => {
    // eslint-disable-next-line no-eval
    const el = eval(resolverSrc);
    if (!el) return null;

    function rectOf(node) {
      const r = node.getBoundingClientRect();
      // Walk ancestors, not just the node: a child of a fixed header is
      // itself viewport-relative even though its own computed position is
      // static, so checking only the node adds scroll offset to nav
      // children and reports them thousands of px down the document.
      let fixed = false;
      for (let n = node; n && n !== document.documentElement; n = n.parentElement) {
        if (getComputedStyle(n).position === "fixed") {
          fixed = true;
          break;
        }
      }
      const round = (n) => Math.round(n * 10) / 10;
      // Fixed-position elements (the nav) are viewport-relative by
      // definition — adding scroll offset would misrepresent a position
      // that never actually moves with the page.
      return {
        x: round(r.x + (fixed ? 0 : window.scrollX)),
        y: round(r.y + (fixed ? 0 : window.scrollY)),
        width: round(r.width),
        height: round(r.height),
        positioning: fixed ? "fixed (viewport-relative)" : "document-relative",
      };
    }
    function textMetricsOf(node) {
      const cs = getComputedStyle(node);
      return {
        fontFamily: cs.fontFamily,
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
        lineHeight: cs.lineHeight,
        letterSpacing: cs.letterSpacing,
        color: cs.color,
      };
    }
    function describeNode(node, name) {
      const cs = getComputedStyle(node);
      const isTextNode =
        node.children.length === 0 && node.textContent.trim().length > 0;
      return {
        name,
        selector: node.tagName.toLowerCase() + (node.id ? `#${node.id}` : ""),
        rect: rectOf(node),
        borderRadius: cs.borderRadius,
        backgroundColor: cs.backgroundColor,
        ...(isTextNode ? { text: textMetricsOf(node) } : {}),
      };
    }

    const container = describeNode(el, "container");
    const children = {};
    el.querySelectorAll("h1, h2, h3, p, button, a[class], img, video, canvas").forEach(
      (child, i) => {
        const label =
          child.tagName.toLowerCase() +
          (child.className && typeof child.className === "string"
            ? "." + child.className.split(" ")[0]
            : "") +
          `#${i}`;
        children[label] = describeNode(child, label);
      }
    );
    return { container, children };
  };

  const measureKeys = [
    "nav",
    "hero",
    "usSection",
    "advisorSection",
    "growSection",
    "advisorFrame",
    "bloomSection",
    "bloomDarkBox",
    "whatsappCard",
    "faqSection",
    "faqCard",
    "footer",
    "footerBar",
  ];

  for (const key of measureKeys) {
    const resolverSrc = resolverFor(key);
    const handle = await page.evaluateHandle(resolverSrc);
    const isNull = await page.evaluate((h) => h === null || h === undefined, handle);
    if (!isNull) {
      if (key === "hero") {
        // GSAP pins Hero (position: fixed) for a 1350px scroll distance
        // (150% of the 900px viewport) before releasing it back into
        // normal flow — generic scrollIntoView() lands past that release
        // point, measuring where the pin *ends* rather than the section
        // itself. What a reviewer actually wants to compare against
        // Figma's static Hero mockup is its resting state at the top of
        // the page, same scroll position 01-nav-hero.png was captured at.
        await page.evaluate(() => window.scrollTo(0, 0));
      } else {
        await page.evaluate((h) => h.scrollIntoView({ block: "center" }), handle);
      }
      await page.waitForTimeout(150);
    }
    const result = await page.evaluate(
      ({ resolverSrc, measureFnSrc }) => {
        // eslint-disable-next-line no-eval
        const fn = eval(`(${measureFnSrc})`);
        return fn(resolverSrc);
      },
      { resolverSrc, measureFnSrc: measureFn.toString() }
    );
    measurements.sections[key] = result || { error: "not found" };
  }

  writeFileSync(
    path.join(__dirname, "measurements.json"),
    JSON.stringify(measurements, null, 2)
  );

  await browser.close();
  console.log("[capture] done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
