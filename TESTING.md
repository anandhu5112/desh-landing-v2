# Testing

Automated tests make fast iteration safe by checking both component behavior and the real booking journey before release.

## Commands

- `npm test` runs Vitest component tests in jsdom.
- `npm run test:e2e` builds the static export, serves the exact `out/` files locally, and runs Playwright against them.
- `npm run build` runs the production build and TypeScript validation.

## Layers and conventions

- Component tests live beside the component as `*.test.tsx` and use Testing Library queries that reflect what a visitor can perceive.
- Browser tests live in `tests/e2e/*.spec.ts` and cover journeys spanning multiple components or third-party integrations.
- Bug fixes should include a regression test that fails without the fix.
- New conditional behavior should cover each meaningful branch, including recoverable error and missing-data states.
