"use client";

import type { ReactNode } from "react";
import Button from "@/components/ui/Button";
import { CAL_BOOKING_URL } from "@/lib/booking";
import { useContactModal } from "./ContactModalProvider";

type AdvisorCtaProps = {
  className?: string;
  children: ReactNode;
  /** Preselected in the enquiry form on the fallback path only — once a
      booking URL is configured the CTA never opens the modal. */
  fallbackReason?: string;
};

/**
 * The page's primary "Let’s talk money" CTA in Hero, US, India, Bloom,
 * and AdvisorSection.
 *
 * Shared rather than copied per section — this is UI chrome like Button and
 * LogoCarousel, not section content, and the whole point is that all five
 * land in the same place.
 *
 * New tab, deliberately: booking is a detour, and a visitor who bounces off
 * the Cal.com page should still have the landing page behind it.
 */
export default function AdvisorCta({
  className,
  children,
  fallbackReason,
}: AdvisorCtaProps) {
  const { open: openContact } = useContactModal();

  if (CAL_BOOKING_URL) {
    return (
      <Button
        href={CAL_BOOKING_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </Button>
    );
  }

  // No booking page configured yet — the enquiry modal is a working path to
  // an advisor, which a link to nowhere is not.
  return (
    <Button
      type="button"
      className={className}
      onClick={() => openContact({ reason: fallbackReason })}
    >
      {children}
    </Button>
  );
}
