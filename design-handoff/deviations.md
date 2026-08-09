# Deviations from Figma

Status as of the Figma-fidelity pass against node `379:14560`. Rows marked
**RESOLVED** were fixed in that pass; rows marked **OPEN** remain, each for a
stated reason.

---

### 1. Grid margin/gutter — **RESOLVED**

- **Figma:** 12 columns, 32px margin, 20px gutter (1440px reference → 96.33px columns).
- **Was:** 16px margin, 16px gutter → 101.33px columns.
- **Now:** `--page-margin: 32px`, `--grid-gutter: 20px` in `globals.css`. The
  per-section `.panel` overrides in `GrowSection`/`UsSection`/`BloomSection`/
  `Footer` that hardcoded `16px` now read `var(--page-margin)`, so the token is
  actually the single source of truth rather than being shadowed.
- **Verified:** column starts land on 32 / 148.3 / 264.7 / 381 / 497.3 / 613.7 /
  730 / 846.3 / 962.7 / 1079 / 1195.3 / 1311.7, content right edge 1408.
  UsSection text column 728 → **730**; GrowSection content 134.7 → **148.3**;
  footer bottom bar 16 → **32**.

### 2. BloomSection/Footer colour treatment — **RESOLVED**

- **Figma:** node `379:15555` is a single `#000` rectangle, 32px radius on all
  four corners, x=32 w=1376 — one continuous dark panel carrying both "Wealth
  grows with time" and "Let's build your portfolio together", white text
  throughout.
- **Was:** `Footer` wrapped the portfolio CTA in a white `.heroCard` (40px top
  radius, black text), breaking the dark surface.
- **Now:** the white card is gone. The portfolio CTA and the WhatsApp card moved
  out of `Footer` and into `BloomSection`'s `.darkBox`. `Footer` is just the
  hills scene and the closing tagline/copyright bar.
- **Also fixed:** BloomSection's internal layout now matches node `379:15556` —
  heading centred at the top with the subtext centred under it, then flower left
  / calculator right. It was previously a left-hand text column beside the bloom.
- The WhatsApp card stays a light card (`#f8f8f8`, 32px radius) straddling the
  panel's bottom edge, per Figma node `379:15567`.

### 3. Heading type scale ceiling — **OPEN (intentional)**

Figma uses 80px for the BloomSection/Footer headings; the implementation holds
the shared scale. Explicitly out of scope: font sizes stay as they are today.

### 4. Body copy line-height — **OPEN (intentional)**

Figma specifies `27px` (≈1.6875); the site uses `1.4`. Explicitly out of scope
for the same reason as #3.

### 5. Nav / CTA label typeface — **OPEN (intentional)**

Figma specifies `Archivo Medium`; the site uses `Inter` as its one UI typeface.
Font families stay as they are today.

### 6. FAQ section — **RESOLVED**

Built from node `379:15514` as `FaqSection`, placed between the dark panel and
the closing footer: centred "Frequently Asked Questions" heading, 6-item
accordion, `#F8F8F8` cards at **24px** radius, +/× icons, second item expanded by
default (matching node `379:15523`). Typography is mapped onto existing tokens —
no new font sizes were introduced. `capture.mjs` now emits `07-faq.png` /
`07-faq-grid.png`.

### 7. Marquee divider banners — **OPEN (kept by decision)**

Neither banner appears in node `379:14560`. Both are kept: the current vertical
rhythm, including both banners and the flush section boundaries, is held fixed
by decision. Measured gaps are unchanged at 93px each.

### 8. Section vertical rhythm — **OPEN (kept by decision)**

Flush boundaries retained, unchanged. Verified identical before/after:
hero→us 1350, us→advisor 93, advisor→grow 0, grow→bloom 93.

### 9. Unverified colours/radii — **RESOLVED**

Every flagged value was sampled from Figma this pass. See `tokens.md`. The
notable correction: there is no single 24px "system radius" — Figma uses **32px**
for the large containers, **24px** for FAQ cards, **16px** for the nav pill and
**10px** for buttons.

---

## Summary

| # | Deviation | Status |
|---|---|---|
| 1 | Grid margin 32px / gutter 20px | ✅ Resolved |
| 2 | Continuous dark panel, white card removed | ✅ Resolved |
| 3 | Heading scale capped below Figma's 80px | ⬜ Open — intentional |
| 4 | Body line-height 1.4 vs Figma's ~1.69 | ⬜ Open — intentional |
| 5 | Inter vs Figma's Archivo for labels | ⬜ Open — intentional |
| 6 | FAQ section | ✅ Resolved |
| 7 | Marquee banners not in this Figma frame | ⬜ Open — kept by decision |
| 8 | Flush section boundaries vs Figma's gaps | ⬜ Open — kept by decision |
| 9 | Colours/radii unverified | ✅ Resolved |

## Known remaining mismatches

Measured against node `379:13529` ("end image"), the standalone frame of these
sections. Relative offsets in it are identical to `379:14560`, so the two agree.

| Item | Figma | Built | Why |
|---|---|---|---|
| WhatsApp card width | 678px | 661px | Figma pads the card 16px left but 32px right. Kept symmetric at 16px; everything inside (285px QR, 312px text column, 32px gap, 317px height) matches. |
| Dark panel height | 1759px | 1526px | The two headings render at 64px rather than Figma's 80px (frozen by decision), and Figma's calculator block is a *pasted screenshot* (node `379:13576`, "Screenshot 2026-08-05…"), not a laid-out frame — its 818px height is not a spec. The flower now renders at its native 540×720 atlas size. |
| FAQ heading | 40px | 37px | `--fs-heading-modal` is the only existing token with a 40px ceiling, and it only reaches it at a 1920px viewport. Holding to "no new font sizes" leaves it 3px short at 1440px. |
| FAQ / footer centring | centre-x 725.5 | centre-x 720 | Figma's FAQ frame (x=271, w=909) sits 5.5px right of page centre. Built centred on the grid instead. |

Vertical rhythm inside the panel now matches Figma exactly: 80px top inset,
48px heading→calculator, 48px calculator→portfolio, 61px portfolio→card, and a
134px card overhang past the panel's bottom edge.
