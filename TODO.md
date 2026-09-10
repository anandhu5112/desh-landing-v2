# TODO

## 1. Drop "US stocks" — offer a dollar-buying alternative instead
- [ ] Cofounder's call: we should **not** suggest US stocks to NRI users.
- [ ] Replacement: an option for the NRI user to **buy dollars** (hold USD) rather than
      buy US equities.
- [ ] Open decision — which instrument do we actually offer? (USD deposit / USD savings,
      forex remittance, USD-denominated fund, something else.) Needed before copy is final.
- [ ] Check whether anything beyond copy depends on this (FAQ answers, advisor script,
      contact/booking flow).

## 2. Update the copy to match
Every place that currently says "US stocks":
- [ ] `src/app/layout.tsx:47` — SEO description
- [ ] `src/app/layout.tsx:54` — OpenGraph description
- [ ] `src/app/layout.tsx:69` — Twitter card description
- [ ] `src/components/FaqSection.tsx:25` — "what can I invest in" answer
- [ ] `src/components/FaqSection.tsx:118` — closing FAQ blurb
- [ ] Re-read the whole page after the swap — the value prop is currently
      "Indian mutual funds **and** US stocks"; the pairing needs to still make sense.
