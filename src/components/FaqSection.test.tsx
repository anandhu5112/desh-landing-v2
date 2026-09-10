import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import FaqSection from "./FaqSection";

afterEach(() => {
  cleanup();
});

function answerFor(question: RegExp): { trigger: HTMLElement; text: string } {
  const trigger = screen.getByRole("button", { name: question });
  const panelId = trigger.getAttribute("aria-controls");
  const panel = panelId ? document.getElementById(panelId) : null;
  if (!panel) throw new Error(`No answer panel for ${question}`);
  return { trigger, text: panel.textContent ?? "" };
}

/**
 * Desh cannot onboard residents of the United States or Canada, so this
 * answer is the one place on the page that says so in full. It is plain
 * copy in a const array — nothing else would fail if a rewrite quietly
 * dropped a country — so the exclusion is pinned here.
 *
 * The booking card carries the same exclusion at the point of conversion;
 * ContactModal.test.tsx guards that one.
 */
describe("FAQ eligibility answer", () => {
  it("names both countries Desh cannot serve, as an exclusion", () => {
    render(<FaqSection />);
    const { text } = answerFor(/who can invest through desh/i);

    expect(text).toMatch(/\bUnited States\b/);
    expect(text).toMatch(/\bCanada\b/);
    // Both names have to sit inside a negative clause: listing them as
    // places Desh *does* support would pass a bare name check.
    expect(text).toMatch(/\bnot\b[^.]*\bUnited States\b[^.]*\bCanada\b/i);
  });

  it("keeps that answer readable once its question is opened", () => {
    render(<FaqSection />);
    const { trigger } = answerFor(/who can invest through desh/i);

    // Collapsed on load — the second item is the one Figma shows open.
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(trigger);

    const { trigger: opened, text } = answerFor(/who can invest through desh/i);
    expect(opened).toHaveAttribute("aria-expanded", "true");
    // Panels stay mounted at every state, so `inert` is what actually keeps
    // a collapsed answer out of the accessibility tree.
    const panel = document.getElementById(opened.getAttribute("aria-controls")!)!;
    expect(panel.hasAttribute("inert")).toBe(false);
    expect(text).toMatch(/\bCanada\b/);
  });
});
