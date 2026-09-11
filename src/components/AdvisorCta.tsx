"use client";

import type { ReactNode } from "react";
import Button from "@/components/ui/Button";
import { useContactModal } from "./ContactModalProvider";

/** Introduce the co-founder before sending visitors to the booking page. */
export default function AdvisorCta({ className, children }: { className?: string; children: ReactNode }) {
  const { open, prefetchBooking } = useContactModal();
  return (
    <Button
      type="button"
      className={className}
      onClick={() => open({ tab: "contact" })}
      onMouseEnter={prefetchBooking}
      onFocus={prefetchBooking}
    >
      {children}
    </Button>
  );
}
