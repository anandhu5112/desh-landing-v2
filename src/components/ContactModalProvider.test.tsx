import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import ContactModalProvider, { useContactModal } from "./ContactModalProvider";

const getCalApi = vi.fn();
const calApi = vi.fn();

vi.mock("@calcom/embed-react", () => ({
  // BookingExperience (mounted for real once a CTA opens the "contact" tab —
  // see ContactModal) renders this as the embed itself; only getCalApi is
  // this file's actual concern, so the embed is stubbed to a static div, the
  // same shape BookingExperience.test.tsx already mocks it as.
  default: () => <div data-testid="cal-embed">Calendar</div>,
  getCalApi: (...args: unknown[]) => getCalApi(...args),
}));

vi.mock("@/lib/booking", () => ({
  CAL_BOOKING_URL: "https://cal.com/aswinps/30min",
}));

vi.mock("next/image", () => ({
  default: ({
    alt,
    priority,
    fill,
    sizes,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean; fill?: boolean }) => {
    void priority;
    void fill;
    void sizes;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={alt ?? ""} {...props} />;
  },
}));

/** A CTA that opens the modal, standing in for AdvisorCta/SiteNav/Hero's
    real buttons — all of which wire the same two handlers to `open` and
    `prefetchBooking`. */
function BookingCta() {
  const { open, prefetchBooking } = useContactModal();
  return (
    <button
      type="button"
      onClick={() => open({ tab: "contact" })}
      onMouseEnter={prefetchBooking}
      onFocus={prefetchBooking}
    >
      Talk to an advisor
    </button>
  );
}

// Pays for compiling ContactModal's module graph (icons, the booking flow,
// etc.) once, up front, instead of letting whichever test happens to fire
// the first `loadContactModal()` eat a multi-second cold-transform cost —
// real browsers pay this once off a warm cache, not on every interaction.
beforeAll(async () => {
  await import("./ContactModal");
}, 20000);

beforeEach(() => {
  getCalApi.mockReset();
  calApi.mockReset();
  getCalApi.mockResolvedValue(calApi);
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

describe("an untouched landing page", () => {
  it("never asks Cal.com for anything", async () => {
    render(
      <ContactModalProvider>
        <BookingCta />
      </ContactModalProvider>,
    );

    // Give any stray microtask/timer a chance to fire before asserting the
    // negative — this is the same shape of check a real "no network calls
    // on load" assertion would make against the browser's network panel.
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(getCalApi).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("hover/focus intent", () => {
  it("warms the calendar on pointer hover, before any click", async () => {
    render(
      <ContactModalProvider>
        <BookingCta />
      </ContactModalProvider>,
    );

    fireEvent.mouseEnter(screen.getByRole("button", { name: /talk to an advisor/i }));

    await waitFor(() => expect(getCalApi).toHaveBeenCalledWith({ namespace: "desh-modal-booking" }));
    await waitFor(() => expect(calApi).toHaveBeenCalledWith("preload", { calLink: "aswinps/30min" }));
  });

  it("warms the calendar on keyboard focus", async () => {
    render(
      <ContactModalProvider>
        <BookingCta />
      </ContactModalProvider>,
    );

    fireEvent.focus(screen.getByRole("button", { name: /talk to an advisor/i }));

    await waitFor(() => expect(getCalApi).toHaveBeenCalledTimes(1));
  });

  it("dedupes repeated hover/focus into a single warm-up", async () => {
    render(
      <ContactModalProvider>
        <BookingCta />
      </ContactModalProvider>,
    );

    const cta = screen.getByRole("button", { name: /talk to an advisor/i });
    fireEvent.mouseEnter(cta);
    fireEvent.focus(cta);
    fireEvent.mouseEnter(cta);

    await waitFor(() => expect(getCalApi).toHaveBeenCalledTimes(1));
  });

  it("retries on a later hover after a failed warm-up", async () => {
    getCalApi.mockRejectedValueOnce(new Error("network down"));

    render(
      <ContactModalProvider>
        <BookingCta />
      </ContactModalProvider>,
    );

    const cta = screen.getByRole("button", { name: /talk to an advisor/i });
    fireEvent.mouseEnter(cta);
    await waitFor(() => expect(getCalApi).toHaveBeenCalledTimes(1));

    fireEvent.mouseEnter(cta);
    await waitFor(() => expect(getCalApi).toHaveBeenCalledTimes(2));
  });
});

describe("opening the modal", () => {
  it("opens immediately on click even without a prior hover/focus", async () => {
    render(
      <ContactModalProvider>
        <BookingCta />
      </ContactModalProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /talk to an advisor/i }));

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
  });

  it("opens on the requested tab", async () => {
    render(
      <ContactModalProvider>
        <BookingCta />
      </ContactModalProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /talk to an advisor/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /choose a time/i })).toBeInTheDocument(),
    );
  });

  it("closes on Escape", async () => {
    // Reduced motion so the close skips straight to unmounting instead of
    // waiting on a CSS animationend jsdom never fires — see ContactModal's
    // own phase handling, which this same shortcut relies on.
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <ContactModalProvider>
        <BookingCta />
      </ContactModalProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /talk to an advisor/i }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
