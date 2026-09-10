"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import ContactModal, { type ContactTab } from "./ContactModal";

/** The screen a CTA should open. */
export type ContactIntent = { tab?: ContactTab };

type ContactModalApi = {
  open: (intent?: ContactIntent) => void;
  close: () => void;
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

  // Preload the Cal.com iframe in the background shortly after the site loads
  // so that when the user opens the modal, the calendar appears instantly.
  useEffect(() => {
    const timer = setTimeout(() => {
      import("@calcom/embed-react").then(({ getCalApi }) => {
        getCalApi({ namespace: "desh-modal-booking" }).then((api) => {
          import("@/lib/booking").then(({ CAL_BOOKING_URL }) => {
            const calLink = CAL_BOOKING_URL.replace(/^https?:\/\/(?:www\.)?cal\.com\//, "").split(/[?#]/)[0];
            // Preload with the same config as the embed so the iframe URL matches
            // and we don't accidentally cache the default dark mode.
            api("ui", {
              theme: "light",
              layout: "month_view",
            });
            api("preload", { calLink });
          });
        });
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Stable identity: every CTA on the page consumes this, and the object
  // being new on each render would invalidate them all on any state change.
  const api = useMemo<ContactModalApi>(
    () => ({
      open: (next: ContactIntent = {}) => {
        setIntent(next);
        setOpen(true);
      },
      close: () => setOpen(false),
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
