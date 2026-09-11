import { describe, expect, it, vi } from "vitest";
import {
  collectTextRuns,
  displacementFromMapChannel,
  drawTextRuns,
  needsWebKitGlassFallback,
  opaqueBackgroundColor,
  physicalDisplacementPx,
  specularFromMapChannel,
} from "./webkitGlass";

function withNavigator(
  partial: { userAgent: string; platform?: string; maxTouchPoints?: number },
  run: () => void,
) {
  const originalUA = navigator.userAgent;
  const originalPlatform = navigator.platform;
  const originalTouch = navigator.maxTouchPoints;
  Object.defineProperty(navigator, "userAgent", {
    configurable: true,
    get: () => partial.userAgent,
  });
  Object.defineProperty(navigator, "platform", {
    configurable: true,
    get: () => partial.platform ?? "MacIntel",
  });
  Object.defineProperty(navigator, "maxTouchPoints", {
    configurable: true,
    get: () => partial.maxTouchPoints ?? 0,
  });
  try {
    run();
  } finally {
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      get: () => originalUA,
    });
    Object.defineProperty(navigator, "platform", {
      configurable: true,
      get: () => originalPlatform,
    });
    Object.defineProperty(navigator, "maxTouchPoints", {
      configurable: true,
      get: () => originalTouch,
    });
  }
}

describe("webkit glass fallback detection", () => {
  it("keeps a stable physical displacement for the tuned strength", () => {
    expect(physicalDisplacementPx(0.029)).toBeCloseTo(34.8217, 3);
  });

  it("decodes displacement like SVG feDisplacementMap (not ±1 at the extremes)", () => {
    // Mid-gray is encoded as 128; SVG uses channel/255 - 0.5 (tiny bias vs 0).
    expect(displacementFromMapChannel(128)).toBeCloseTo(128 / 255 - 0.5, 10);
    expect(displacementFromMapChannel(0)).toBeCloseTo(-0.5, 10);
    expect(displacementFromMapChannel(255)).toBeCloseTo(0.5, 10);
    // Old (channel-128)/127 formula was ~2× stronger at the extremes.
    expect(Math.abs(displacementFromMapChannel(255))).toBeLessThan(0.6);
  });

  it("builds specular from blue above mid-gray like liquid-glass", () => {
    expect(specularFromMapChannel(128)).toBeCloseTo(0, 10);
    expect(specularFromMapChannel(255)).toBeCloseTo((255 - 128) / 255, 10);
    expect(specularFromMapChannel(64)).toBe(0);
  });

  it("does not flag desktop Chromium", () => {
    withNavigator(
      {
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        maxTouchPoints: 0,
      },
      () => expect(needsWebKitGlassFallback()).toBe(false),
    );
  });

  it("flags iPhone Chrome (CriOS) because it is still WebKit", () => {
    withNavigator(
      {
        userAgent:
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1",
      },
      () => expect(needsWebKitGlassFallback()).toBe(true),
    );
  });

  it("flags desktop Safari", () => {
    withNavigator(
      {
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
        maxTouchPoints: 0,
      },
      () => expect(needsWebKitGlassFallback()).toBe(true),
    );
  });
});

describe("live text sampling for the Safari backdrop", () => {
  it("collects intersecting copy and skips the nav pill", () => {
    const root = document.createElement("div");
    root.id = "page-scroll-content";
    root.innerHTML = `
      <h2><span>you crossed oceans</span></h2>
      <div id="nav-pill"><span>Desh</span></div>
    `;
    document.body.appendChild(root);
    const orig = Range.prototype.getClientRects;
    Range.prototype.getClientRects = function getClientRects() {
      const host = (this.startContainer as Text).parentElement;
      const isNav = host?.closest("#nav-pill");
      const list = {
        length: 1,
        0: {
          left: isNav ? 9999 : 10,
          top: isNav ? 9999 : 10,
          width: 120,
          height: 18,
          right: isNav ? 10119 : 130,
          bottom: isNav ? 10017 : 28,
        } as DOMRect,
        item(i: number) {
          return i === 0 ? this[0] : null;
        },
      };
      return list as unknown as DOMRectList;
    };
    try {
      const runs = collectTextRuns(root, { left: 0, top: 0, width: 400, height: 80 });
      expect(runs.map((r) => r.text)).toEqual(["you crossed oceans"]);
    } finally {
      Range.prototype.getClientRects = orig;
      root.remove();
    }
  });

  it("draws collected runs into the view in CSS pixels scaled by dpr", () => {
    const fillText = vi.fn();
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      setTransform: vi.fn(),
      fillText,
      font: "",
      fillStyle: "",
      globalAlpha: 1,
      textBaseline: "alphabetic",
      textAlign: "start",
    };
    drawTextRuns(
      ctx as unknown as CanvasRenderingContext2D,
      [
        {
          text: "to build.",
          left: 40,
          top: 20,
          font: "32px serif",
          color: "rgb(0, 0, 0)",
          opacity: 1,
          letterSpacing: "-0.03em",
        },
      ],
      { left: 10, top: 10, width: 200, height: 50 },
      2,
    );
    expect(ctx.setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
    expect(fillText).toHaveBeenCalledWith("to build.", 30, 10);
  });
});

describe("page backdrop sampling", () => {
  it("walks up to the first opaque section fill and skips the pill", () => {
    const section = document.createElement("section");
    section.style.backgroundColor = "rgb(255, 255, 255)";
    const pill = document.createElement("div");
    pill.id = "nav-pill";
    pill.style.backgroundColor = "rgba(0, 0, 0, 0.08)";
    section.appendChild(pill);
    document.body.appendChild(section);
    try {
      expect(opaqueBackgroundColor(pill)).toBe("rgb(255, 255, 255)");
    } finally {
      section.remove();
    }
  });

  it("does not treat the document white as the page fill under the pill", () => {
    document.body.style.backgroundColor = "rgb(255, 255, 255)";
    const panel = document.createElement("div");
    panel.style.backgroundColor = "rgb(0, 0, 0)";
    const pill = document.createElement("div");
    pill.id = "nav-pill";
    document.body.append(panel, pill);
    try {
      // Same geometry as SiteNav: the pill is not inside the section, so
      // walking up from it used to land on body white.
      expect(opaqueBackgroundColor(pill)).toBeNull();
      expect(opaqueBackgroundColor(panel)).toBe("rgb(0, 0, 0)");
    } finally {
      panel.remove();
      pill.remove();
      document.body.style.backgroundColor = "";
    }
  });
});
