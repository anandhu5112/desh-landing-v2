"use client";

import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import type { ContactTab } from "./ContactModal";

// Dynamically loaded: nothing here is needed to render the page itself, only
// to open the modal, so its implementation shouldn't sit in the initial
// bundle. It's still mounted (closed) as soon as the provider is, so its own
// chunk starts fetching in the background right away — closed, it renders
// nothing and touches nothing Cal.com-related; only actually entering the
// booking tab (see ContactModal's own BookingExperience) does that.
const ContactModal = dynamic(() => import("./ContactModal"), { ssr: false });

/** The screen a CTA should open. */
export type ContactIntent = { tab?: ContactTab };

type ContactModalApi = {
  open: (intent?: ContactIntent) => void;
  close: () => void;
  /** Warm the Cal.com embed ahead of an `open()` call — call on hover/focus
      of a booking CTA so the calendar is ready by the time the visitor
      actually clicks. Safe to call repeatedly; only the first call (per
      successful load) does any work. */
  prefetchBooking: () => void;
};

const ContactModalContext = createContext<ContactModalApi | null>(null);

/**
 * Lets any CTA anywhere on the page open the contact modal.
 *
 * The state deliberately does not live in SiteNav any more: the nav pill was
 * the only thing that could reach the modal, which left every "Talk to an
 * Advisor" button on the page inert. Sections are nested several levels deep
 * (ServicesSection owns Us/Advisor/Grow), so context beats threading a prop
 * through each of them.
 *
 * Unlike heroProgress/lenis — plain module refs, because nothing re-renders
 * off them — opening the modal *is* a render, so this is real React state.
 */
export function useContactModal(): ContactModalApi {
  const api = useContext(ContactModalContext);
  if (!api) {
    throw new Error("useContactModal must be used inside <ContactModalProvider>.");
  }
  return api;
}

export default function ContactModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [intent, setIntent] = useState<ContactIntent>({});

  // Guards against duplicate work: a visitor can hover/focus several CTAs
  // (or the same one repeatedly) before ever opening the modal, and the
  // click that follows a hover shouldn't kick off the warm-up a second time.
  // Reset on failure so a later hover/focus/click gets a real retry instead
  // of silently never loading the calendar.
  const prefetchState = useRef<"idle" | "pending" | "done">("idle");

  // Stable identity: every CTA on the page consumes this, and the object
  // being new on each render would invalidate them all on any state change.
  const api = useMemo<ContactModalApi>(
    () => ({
      open: (next: ContactIntent = {}) => {
        setIntent(next);
        setOpen(true);
      },
      close: () => setOpen(false),
      prefetchBooking: () => {
        if (prefetchState.current !== "idle") return;
        prefetchState.current = "pending";

        Promise.all([
          import("@calcom/embed-react").then(({ getCalApi }) =>
            getCalApi({ namespace: "desh-modal-booking" }),
          ),
          import("@/lib/booking"),
        ])
          .then(([calApi, { CAL_BOOKING_URL }]) => {
            const calLink = CAL_BOOKING_URL.replace(/^https?:\/\/(?:www\.)?cal\.com\//, "").split(/[?#]/)[0];
            // Preload with the same config as the embed so the iframe URL matches
            // and we don't accidentally cache the default dark mode.
            calApi("ui", {
              theme: "light",
              layout: "month_view",
            });
            calApi("preload", { calLink });
            prefetchState.current = "done";
          })
          .catch(() => {
            // A CTA left hovered/focused won't retry on its own, but the
            // next hover/focus/click will — and `open()` never depended on
            // this succeeding in the first place.
            prefetchState.current = "idle";
          });
      },
    }),
    [],
  );

  return (
    <ContactModalContext.Provider value={api}>
      {children}
      {/* Mounted once, here — ContactModal portals itself to document.body,
          so where in the tree it sits has no bearing on its stacking. */}
      <ContactModal
        open={open}
        onClose={api.close}
        initialTab={intent.tab ?? "start"}
      />
    </ContactModalContext.Provider>
  );
}
