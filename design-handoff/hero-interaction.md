# Hero sun-rise interaction — how it is mounted

The rising sun (`.sun` in `Hero.module.css`) is a plain absolutely-positioned
circle sitting **inside** `.zoomWrap`, the same layer that holds the hero
landscape imagery — not a sibling of it. Because the sun lives inside that
scaling wrapper, it inherits the GSAP zoom/pan together with the landscape
underneath it and can never drift off the horizon independently of the hills
it is meant to rise behind.

## The frame is static

`.zoomWrap` sits inside `.heroFrame`, a container inset by `--hero-frame-inset`
(bound to `--page-margin`, a flat **32px**) on the **left, right and bottom**.
The top stays flush — the hero runs to the page top under the fixed nav — so
only the bottom two corners round, at `--hero-frame-radius` (32px). The whole
pinned interaction plays inside this frame and never goes full-bleed.

**Why `overflow: hidden` on a parent rather than a `clip-path` on `.zoomWrap`
itself:** a clip-path is resolved in the clipped element's own coordinate
space, so it scales along with the element. Clipping `.zoomWrap` directly would
mean the 32px margin grew to ~51px as the 1.6× zoom played, pushing the frame
past the viewport edge mid-scroll. Clipping from an untransformed parent keeps
the frame fixed while the content moves inside it. Verified: the frame measures
32/32/32/0 at every scroll position from rest through full zoom, and at every
viewport from 360px to 1920px.

`.heroContent` (heading/subtext/CTA) and `.heroOutro` (the closing statement)
are also inside `.heroFrame`, so every layer of the interaction shares one
coordinate space and is clipped to the same margin. That is what keeps the
outro statement centred on the sun: both shift together if the frame changes.

## Sun positioning

`.sun` is centred via `top: 47%; left: 50%` plus negative margins of half its
own `--sun-size` (34vw desktop / 60vw at the ≤1024px breakpoint). Its reveal is
driven purely by a GSAP `yPercent` tween (120 → 0) inside `Hero.tsx`'s pinned
`useGSAP` timeline — no opacity or scale animation on the sun itself, only
vertical translation, timed to settle at the same `0.85` scroll-progress point
(`OUTRO_REVEAL_AT`) that reveals the "Anchor your roots. Expand your reach."
statement over it.

## Timeline

| Beat | Position | What moves |
|---|---|---|
| Spotlight fade | 0 → 0.3 | `.heroRevealImg` opacity → 0 |
| Copy exit | `INTRO_HOLD_DURATION` (0.2) → 0.45 | `.heroContent` opacity → 0, y → −40 |
| Zoom | 0.1 → 1.0 | `.zoomWrap` scale → 1.6, yPercent → 30 |
| Sun rise | 0.5 → 0.85 | `.sun` yPercent 120 → 0 |

`INTRO_HOLD_DURATION` also derives `HERO_INTRO_SETTLED_PROGRESS`, the 0..1
scroll-progress point published through `src/lib/heroProgress.ts` as
`heroIntroSettledRef`. `SiteNav` reads that ref to suppress its hide-on-scroll
through the hero's opening beat, so the nav and the hero copy leave together
rather than competing.

## Change history

An earlier version animated the frame open: `.zoomWrap` carried the clip-path
directly and a GSAP tween drove it to full-bleed over `FRAME_FILL_DURATION`.
That tween is gone — the frame no longer animates, and the constant that paced
it was renamed `INTRO_HOLD_DURATION` since it now only paces the copy exit and
the nav gate. The zoom, sun-rise and outro tweens themselves (scale, yPercent,
durations, easings, trigger positions) are unchanged.
