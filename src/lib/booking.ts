/**
 * Public booking destination, inlined at build time for the static export.
 * The environment variable remains an override, while the canonical public
 * URL keeps production booking available when no deployment variable is set.
 */
export const CAL_BOOKING_URL =
  process.env.NEXT_PUBLIC_CAL_BOOKING_URL?.trim() ||
  "https://cal.com/aswinps/30min";
