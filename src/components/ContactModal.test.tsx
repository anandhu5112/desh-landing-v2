import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import ContactModal from "./ContactModal";

vi.mock("next/image", () => ({
  default: ({
    alt,
    priority,
    fill,
    sizes,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & {
    priority?: boolean;
    fill?: boolean;
  }) => {
    void priority;
    void fill;
    void sizes;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt ?? ""} {...props} />;
  },
}));

beforeAll(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

afterEach(() => {
  cleanup();
});

/**
 * The booking card is where a visitor commits to a call, so the countries
 * Desh cannot onboard have to be named before the button, not after the
 * conversation. Nothing else fails if the line is dropped in a copy pass —
 * hence this guard. The FAQ carries the same exclusion at length; see
 * FaqSection.test.tsx.
 */
describe("booking card eligibility note", () => {
  function renderBookingCard() {
    render(<ContactModal open onClose={() => {}} initialTab="contact" />);
    const note = screen
      .getAllByText(/does not currently serve/i)
      .find((element) => element.tagName === "P");
    if (!note) throw new Error("No eligibility note on the booking card");
    return note;
  }

  it("names both countries Desh cannot serve", () => {
    const note = renderBookingCard();

    expect(note.textContent).toMatch(/\bUnited\s+States\b/);
    expect(note.textContent).toMatch(/\bCanada\b/);
  });

  it("says so before the button, not after it", () => {
    const note = renderBookingCard();
    const button = screen.getByRole("button", { name: /choose a time/i });

    // DOCUMENT_POSITION_FOLLOWING: the button comes after the note. The card
    // pushes its actions to the foot of the column, so reading order is the
    // only thing that keeps the note from landing under the CTA.
    expect(note.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
  });
});

describe("ContactModal community tab", () => {
  it("renders the Join community link with WhatsApp URL", () => {
    render(<ContactModal open onClose={() => {}} initialTab="join" />);

    const link = screen.getByRole("link", { name: /join community/i });
    expect(link).toBeDefined();
    expect(link.getAttribute("href")).toContain("chat.whatsapp.com");
  });
});
