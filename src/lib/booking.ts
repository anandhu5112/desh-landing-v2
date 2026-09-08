/**
 * The Cal.com page every "Talk to an Advisor" CTA sends visitors to.
 *
 * A booking link is public, not a secret, so this could equally be a literal
 * string in this file — it's read from the environment only so the URL can
 * be set without a code change. Either way it has to be inlined at build
 * time: next.config sets output: "export", so there is no server to read
 * process.env at request time, which is what NEXT_PUBLIC_ guarantees.
 *
 * Empty until it's configured. AdvisorCta treats that as "no booking page
 * yet" and falls back to the enquiry modal rather than rendering a link to
 * nowhere.
 */
export const CAL_BOOKING_URL = process.env.NEXT_PUBLIC_CAL_BOOKING_URL ?? "";
