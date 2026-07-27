import { clsx, type ClassValue } from "clsx";

/**
 * Merge class names. This project does not use Tailwind, so the usual
 * `tailwind-merge` pass is omitted — clsx alone is enough here.
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
