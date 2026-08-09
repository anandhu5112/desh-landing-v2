# Token comparison — Figma vs. implementation

**Figma file:** `QXm5ck0C7IOjYi6CXmKWra` ("Desh - Landing V2")
**Figma reference used for section order/positions/type/color:** node `379:14560` ("grid in design"), a 1440×6423 composite of the full page, plus targeted `get_design_context` pulls on individual sections (node IDs cited per row where relevant).
**Implemented values:** read directly from `src/app/globals.css` and each component's `.module.css`, cross-checked against `measurements.json`'s computed styles at a live 1440px render.

Methodology note: this Figma file has no Figma Variables bound to the page (`get_variable_defs` on 379:14560 returned `{}`), so every "Figma value" below is a literal value read off individual layers via the Figma MCP, not a named token — there is nothing named to diff against; the comparison is purely by value.

## Colors

| Token | Figma value | Implemented value | Used | Match |
|---|---|---|---|---|
| Ink / primary text | `#000000` | `#000000` (`--color-ink`) | All body copy, most headings | ✅ |
| Surface (dark panel) | `#000000` (node `379:15555`) | `#000000` (`--bloom-surface`) | BloomSection `.darkBox`, Footer bar | ✅ |
| Accent yellow | `#FFC400` | `#ffc400` | Marquee dots, avatar "+" badge, `finalCompact`, WhatsApp card hover | ✅ |
| FAQ card background | `#F8F8F8` (node `379:15517`) | `#f8f8f8` | `FaqSection` `.item` | ✅ |
| WhatsApp card background | `#F8F8F8` (sampled, node `379:15567`) | `#f8f8f8` | `BloomSection` `.whatsappCard` | ✅ **corrected from `#f7f6f4`** |
| "Join Our Community" CTA | `#00B531` (node `379:16354`) | `#00b531` | `BloomSection` `.ctaGreen` | ✅ verified |
| Nav "Contact us" fill | `#EFEFEF` (node `379:14574`) | `#efefef` | `SiteNav` | ✅ verified — Figma does **not** specify white here |
| Portfolio CTA fill | `#FFFFFF`, black label (node `379:15565`) | `#ffffff`, black label | `BloomSection` `.portfolioCta` | ✅ |
| "Wealth grows" / "Let's build your portfolio" text | `#FFFFFF` on the continuous dark panel | `#ffffff` on `.darkBox` | BloomSection | ✅ **resolved** |
| Hairline divider | n/a — the divider belonged to the removed white card | *(element removed)* | — | n/a |

## Type scale

| Role | Figma literal size(s) seen | Implemented token | Implemented value @1440px | Match |
|---|---|---|---|---|
| Hero heading ("Invest like a true...") | 48–64px (varies by frame: `364:9997`≈61px, `379:14564`≈48px context) | `--fs-heading` | `clamp(40px, …, 64px)` → 64px | ⚠️ token caps below some Figma instances — deliberate, see below |
| Section heading (Us/Advisor/Grow) | 64px (`379:15492`/`379:15497`/`379:15508`) | `--fs-heading` | 64px | ✅ at this viewport |
| BloomSection / Footer hero heading | **80px** (`379:15558`, `379:15562`) | `--fs-heading` | 64px (hard ceiling) | ❌ Figma goes 16px larger than the shared scale's ceiling |
| FAQ heading | 40px (`379:15515`) | *(not implemented)* | — | ⚠️ N/A |
| Body / subtext | 16px, `IBM Plex Serif Light`, `line-height: 27px` | `--fs-body` | 16px flat, `line-height: 1.4` (not `27px`/`1.6875`) | ⚠️ size matches, line-height doesn't (see deviations.md) |
| Nav links / CTA label | 14px, `Archivo Medium` (Figma) / `Inter` (implemented) | `--fs-nav` | 14px | ⚠️ size matches, typeface differs (Archivo vs. Inter — see deviations.md) |
| FAQ question | 16px, `General Sans Medium` | *(not implemented)* | — | ⚠️ N/A |
| Caption / uppercase label | 12px | `--fs-caption` | 12px | ✅ |
| Heading font family | `Mona Sans` | `Mona Sans` (`--font-heading`, local `woff2`) | — | ✅ |
| Body font family | `IBM Plex Serif` (Light/Regular vary by section) | `IBM Plex Serif` (`--font-body`, weight 300 throughout) | — | ⚠️ Figma mixes Light (300) and Regular (400) by section; implementation is flat 300 everywhere |

**On the 64px heading ceiling:** this was a deliberate, repeated decision made across this whole project (documented in nearly every component's CSS comments) — Figma's per-section literal sizes range from 48px to 80px depending on the frame; the implementation intentionally holds every heading to one shared `--fs-heading`/`--ls-heading` pair (40px→64px fluid) so the type scale reads as one consistent system across the page rather than a different literal size per section. This is flagged here as a known, intentional deviation, not an oversight.

## Corner radii

| Element | Figma value | Implemented value | Match |
|---|---|---|---|
| Primary CTA buttons | 10px | 10px (`Button` base — was 12px, so the Hero CTA rendered 12px) | ✅ **corrected** |
| Avatar / partner-logo badges | 6px | 6px | ✅ |
| Hero frame (rest state) | **32px, bottom two corners only**; x=32, w=1376, flush to top (node `379:14563`) | `inset(0 32px 0 32px round 0 0 32px 32px)` | ✅ **corrected** (was 24px on the *top* corners with a 32px top inset) |
| "Real Advisors" sky box | **32px, top two corners only**; x=32, w=1376 (node `379:15483`) | 32px top corners, `margin-inline: var(--page-margin)` | ✅ **corrected** (was 0px, full-bleed) |
| Continuous dark panel | **32px, all corners**; x=32, w=1376 (node `379:15555`) | 32px, `margin-inline: var(--page-margin)` | ✅ **corrected** (was 0px, full-bleed) |
| WhatsApp card | **32px** (measured off the Figma render) | 32px | ✅ **corrected** (was 16px) |
| FAQ accordion cards | **24px** (node `379:15517`) | 24px | ✅ |
| Nav pill container | 16px (node `379:14569`) | 16px | ✅ |
| QR image | no container fill or radius in Figma — the QR is a bare vector group on the card | `.qrWrap` 8px, but the PNG fills it opaquely so 0px is what renders | ⚠️ cosmetically moot; reconciles tokens.md's "8px" against the measured 0px |

**There is no single "system radius."** Figma uses four distinct steps:
**32px** for the large page containers, **24px** for FAQ cards, **16px** for the
nav pill, **10px** for buttons.

## Section vertical padding / inter-section gaps ("X" spacings)

Figma gaps below are the vertical distance between one section's content-frame edge and the next, measured off node `379:14560`'s child frame `y`/`height` values (1440px-wide reference). These are **content-frame-to-content-frame** gaps, not necessarily section-background-to-section-background — Figma layers this file at the content-block level, not with an explicit full-bleed section background per block (only Hero, the Bloom/Footer card, and the WhatsApp mini-card have their own background rects). Implemented gaps are read from `measurements.json` at the same 1440px width.

| Boundary | Figma gap (content-frame to content-frame) | Implemented gap | Match |
|---|---|---|---|
| Hero → Invest beyond borders | ~70px (827→896) | 0px (sections stack flush; `ServicesSection`'s own `--space-*` gap is between **elements inside** each section, not between sections) | ❌ |
| Invest beyond borders → Real Advisors | ~78px (1490→1568, bg-image edge) | 0px + `MarqueeDivider`'s own ~93px-tall content banner sits between them (not empty space — see note below) | ❌ structurally different approach |
| Real Advisors → Grow wealth in India | ~0px (`2406`→`2327`, i.e. these two overlap in Figma's own content-frame coordinates) | 0px (flush) | ✅ roughly |
| Grow wealth in India → Wealth grows (calculator) | ~150px (2962.75→3113) | 0px (flush; `MarqueeDividerBorders` sits at this boundary instead, per an explicit "zero margin, sticky to SIP calculator" requirement from earlier in this project) | ❌ structurally different approach |
| Wealth grows → Let's build your portfolio (footer CTA) | **0px — same continuous frame** (`379:15556`, internal `gap-[48px]` between its own children) | 0px (`BloomSection` and `Footer` are two separate components, but stack flush) | ✅ adjacency matches, though see the white-card color deviation above |
| Footer CTA → FAQ | ~112–490px (varies depending on which edge of the WhatsApp mini-card / FAQ frame is used) | N/A — FAQ not implemented | ⚠️ N/A |
| FAQ → closing footer bar | Frames overlap in Figma's own y-coordinates (5038–5748 vs. 5624–6423) — likely a layer-organization artifact in this specific reference frame, not a real overlap in the live design | N/A | ⚠️ needs designer clarification |

**Important structural note:** Figma's "gap" between India/US and between India/BloomSection appears to be genuine empty negative space. The implementation instead fills those same boundaries with the two marquee banners (`MarqueeDivider`, `MarqueeDividerBorders`) — real, scroll-linked content, not spacing. Neither marquee banner appears anywhere in the `379:14560` reference frame. Both were built from separate, explicitly-fetched Figma nodes earlier in this project (`MarqueeDivider` from node `321:7226`); it's possible they live elsewhere in the file and simply aren't part of this particular composite. **Flagged for designer confirmation** rather than asserted as either correct or wrong — see deviations.md.

## Grid

| Property | Figma (as specified for this review) | Implemented (site's actual CSS grid, `globals.css`) | Match |
|---|---|---|---|
| Columns | 12 | 12 (`--grid-columns`) | ✅ |
| Margin (left/right) | 32px | 32px (`--page-margin`) | ✅ |
| Gutter | 20px | 20px (`--grid-gutter`) | ✅ |
| Computed column width @1440px | 96.33px | 96.33px | ✅ |

Resolved — the site now derives from the same 32/20 system the `*-grid.png`
overlays draw, so content aligns to the pink guides instead of sitting inside
them. Column starts verified at 32 / 148.3 / 264.7 / 381 / 497.3 / 613.7 / 730 /
846.3 / 962.7 / 1079 / 1195.3 / 1311.7, content right edge 1408.
