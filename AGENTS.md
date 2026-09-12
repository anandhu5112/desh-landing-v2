# Repository location — this is the correct copy

This directory, `/Users/vinayaknair/Downloads/desh-landing-2`, is the canonical working
copy. It is the only one with git history and the only one that gets deployed.

A stale, untracked duplicate exists at `/Users/vinayaknair/Documents/desh-landing-2`.
It has no `.git`, its dev server is broken, and it is well behind this copy. Do not
`cd` there and do not copy code out of it without checking this copy first.

Two things do exist only in that stale copy and may be worth porting in (as of
2026-09-04): SEO metadata in `src/app/layout.tsx` plus `public/images/og-image.jpg`,
and mobile `@media (max-width: 767px)` blocks for the Faq/Grow/Us sections.

---

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Testing

- Run component tests with `npm test`.
- Run the production booking journey with `npm run test:e2e`.
- See `TESTING.md` for test layers and conventions.
- Aim for complete coverage of new behavior. Add tests with new functions, regression fixes, error handling, and both sides of conditionals.
- Never commit code that makes existing tests fail.

## Deployment — Cloudflare Workers, NOT Vercel

Production (`getdesh.com` / `www.getdesh.com`) is a **Cloudflare Worker**, configured
in `wrangler.jsonc`: it serves the static export in `./out` (`next build`, this repo
has `output: "export"`) as `custom_domain` routes, with `src/worker.ts` handling Range
requests for video seeking that Cloudflare's plain assets-only path drops.

**To deploy: `npm run deploy`** (runs `next build` then `wrangler deploy`). Confirm
`npx wrangler whoami` is logged in as the site owner first if it's been a while.

**`git push origin main` deploys nothing.** There is no CI/CD wired to GitHub pushes —
committing and pushing only updates the repo. You must run `npm run deploy`
separately, every time, or the live site silently stays on the old build.

**There is a Vercel project for this repo ("desh-landing") — it is not the deploy
target and never was.** `getdesh.com`'s DNS has pointed at Cloudflare the whole time
(nameservers never matched Vercel's), so anything shipped to Vercel had zero effect on
production, however convincing `vercel --prod` looks when it succeeds and reports
"Aliased https://getdesh.com". On 2026-09-12 the `getdesh.com`/`www.getdesh.com`
domain records were removed from that Vercel project and the local `.vercel/` link
was deleted specifically so this stops happening — do not `vercel link` this repo
again or re-add those domains in Vercel. If you're ever unsure what's actually
live, `curl -sI https://getdesh.com/` and look for `server: cloudflare`, or just
run `npm run deploy` again — it's idempotent.
