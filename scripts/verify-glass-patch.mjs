#!/usr/bin/env node
/**
 * Fail the build if liquid-glass-web-react is not patched.
 *
 * The nav's refraction depends entirely on that patch (see
 * patches/liquid-glass-web-react+0.1.1.patch): upstream only uses
 * userSpaceOnUse filter units on iOS, and on its objectBoundingBox path
 * Chrome stops displacing once the filtered element's child is a scroll
 * container — which is exactly how this page is built. Unpatched, the glass
 * does not error or warn. It silently renders flat, and the page still looks
 * plausible, so nothing catches it before a visitor does.
 *
 * The patch is reapplied by `postinstall`. That step can be skipped in ways
 * that are easy to miss — an install that omits dev dependencies, a cache
 * that restores node_modules without rerunning scripts, `--ignore-scripts`.
 * This turns every one of those into a loud build failure instead.
 */
import { readFileSync } from "node:fs";

const TARGET = "node_modules/liquid-glass-web-react/dist/index.js";
// Introduced by the patch; see the patch file for what it replaces.
const MARKER = "USE_USER_SPACE_UNITS";

let source;
try {
  source = readFileSync(new URL(`../${TARGET}`, import.meta.url), "utf8");
} catch {
  console.error(`\n  Cannot read ${TARGET}. Run "npm install" first.\n`);
  process.exit(1);
}

if (!source.includes(MARKER)) {
  console.error(
    [
      "",
      "  liquid-glass-web-react is NOT patched — refusing to build.",
      "",
      `  Expected "${MARKER}" in ${TARGET}.`,
      "  Without it the nav glass renders flat: no error, no warning, just no",
      "  refraction. See patches/liquid-glass-web-react+0.1.1.patch.",
      "",
      "  Fix: npx patch-package",
      "  (normally applied automatically by the postinstall script)",
      "",
    ].join("\n")
  );
  process.exit(1);
}

console.log("  liquid-glass-web-react: patch verified");
