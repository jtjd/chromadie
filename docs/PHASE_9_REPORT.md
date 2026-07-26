# Chromadie 2.0 — Phase 9 Report

**Milestone:** Launch Polish — Runtime Hardening  
**Audit / implementation date:** 2026-07-25  
**Branch:** `redesign/profile-first`

## Milestone boundary

Phase 9 is broader than one safe vertical slice. This report covers the first
launch-hardening slice: performance regression budgets, keyboard route access,
structured media safety, and bounded public HTML/asset caching. It deliberately
does not claim completion of analytics operations, legacy-renderer retirement,
browser/device certification, deeper code-splitting, or moderation operations.

## Baseline status

Phase 8 ended with 71 passing native tests and green build, Svelte check,
ESLint, links, CSP, balance/catalog/scoring drift, database-security, schema
lint, and local reset checks. The production bundle had 254 transformed modules,
a roughly 575 kB minified JavaScript asset, and Vite's existing warning for a
chunk over 500 kB. The shell already had Cloudflare Web Analytics, but there
was no product-event sink; Supabase analytics was disabled.

The current profile route is a public acquisition surface, while owner/private
profile configuration and the `legacy=1` controls renderer must remain
non-cacheable. The existing `Media.svelte` wrapper had an aspect-ratio box but
accepted raw source strings and had no explicit load-error fallback. Dialog and
mobile-menu focus restoration existed, but there was no skip link or shared
route-content focus target.

## Work completed

- Added `scripts/check-performance-budget.mjs` and `npm run check:performance`.
  The current budgets are 650 KiB total JavaScript, 300 KiB CSS, and 12 KiB
  HTML shell.
- Added a keyboard-visible skip link to `#main-content` and focus of the
  content region after programmatic, direct-path, and browser-history
  navigation. Existing auth-dialog and mobile-menu focus restoration remains
  intact.
- Added `src/lib/mediaSafety.js`. Media now accepts same-origin paths and
  HTTPS sources only, rejecting protocol-relative, HTTP, data, blob,
  JavaScript, control-character, and oversized sources.
- Added an accessible `Media.svelte` fallback for invalid or failed sources
  while preserving the layout-reserving aspect-ratio wrapper.
- Added short public cache policies for root, discovery, legal/help, and valid
  public-profile HTML. Missing profiles and `legacy=1` profile responses stay
  `no-cache`; owner data is never put in a cacheable response.
- Added immutable caching for hashed `/assets/*` files and short caching for
  stable brand assets in `public/_headers`.
- Added five focused Phase 9 tests covering source protocols, media fallback,
  skip/focus behavior, cache privacy, security headers, and budget failure
  behavior.

## Failures discovered and resolved

1. The initial performance-budget implementation used URL path strings that
   could retain `%20` for the workspace directory; it was corrected to use
   `fileURLToPath` before reading `dist/`.
2. The build continues to emit Vite's existing >500 kB chunk warning. This is
   recorded as a measured optimization boundary; the new budget passes without
   suppressing the warning.
3. The first focused validation pass was run before the final documentation
   edits; the full required suite was rerun afterward.

No database migration or production data change was required.

## Coverage added

`test/phase-9-launch-polish.test.js` protects:

- safe local/HTTPS media sources and unsafe protocol rejection;
- media load-error and accessible fallback contracts;
- keyboard skip navigation and route-content focus;
- public versus missing/legacy profile cache policy;
- security headers on explicitly cacheable HTML;
- performance-budget definitions and failure behavior.

The native suite finished with **77 passed, 0 failed** before the final full
validation pass.

## Compatibility and migration risks

- The performance budget is a guard, not code-splitting. Lowering it requires
  measured route-level loading work and a browser performance comparison.
- Cache policy must remain coupled to profile privacy. Never cache owner drafts,
  social settings, private activity, entitlement keys, or legacy controls.
- The skip link and route focus must not steal focus from an active modal or
  mobile navigation panel. New overlays must use the existing focus helpers.
- Media safety currently has no upload/storage contract. Future media and
  embeds need a separate CSP, privacy, entitlement, mobile, and moderation
  review.
- Cloudflare Web Analytics is shell-level measurement only. A product funnel
  needs consent, safe event fields, retention, deletion, and operational
  ownership before adding a sink or database table.
- `legacy=1` still owns mood, pinned badges, rivals, and deletion. It cannot be
  removed until equivalent owner controls and redirects are shipped.

## Recommended next Phase 9 boundary

The consented product-event and moderation/operations documentation
continuation is recorded in `docs/PHASE_9_ANALYTICS_REPORT.md`. The next
separate slice should perform a real browser/device accessibility and
performance audit before any measured code-splitting or legacy-renderer
retirement. The current event adapter still has no production sink or assigned
operational owner.

## Acceptance assessment

**GO for this Phase 9 launch-hardening slice.** Performance, keyboard access,
media safety/fallback, public/private cache boundaries, focused tests, and
required existing contracts are implemented without changing auth, RLS,
scoring, rolls, rewards, economy, entitlements, social state, or historical
data.

**NO-GO for declaring the entire Phase 9 roadmap complete.** Product analytics,
moderation operations documentation, browser/device certification, deeper
bundle optimization, media/embeds, OG/share expansion, and legacy-renderer
retirement remain unimplemented and require separate acceptance criteria.

## Final validation record

Exact final command results are recorded after the complete post-edit suite:

| Command | Result | Exact result |
| --- | --- | --- |
| `npm run build` | PASS | `vite v8.1.3`; 255 modules transformed; JS asset 575.78 kB; CSS asset 241.84 kB; existing Vite warning for a chunk over 500 kB |
| `npm run check` | PASS | `svelte-check found 0 errors and 0 warnings` |
| `npx eslint src/` | PASS | No output/errors |
| `npm test` | PASS | 77 passed, 0 failed |
| `npm run check:links` | PASS | `Internal link check passed.` |
| `npm run check:csp` | PASS | `CSP check passed for 1 inline script block(s) in dist/index.html.` |
| `npm run check:performance` | PASS | JavaScript 562.29 kB/650.00 kB; CSS 236.17 kB/300.00 kB; HTML 5.59 kB/12.00 kB |
| `npm run check:balance-drift` | PASS | `Balance drift check passed: 66 v2 score conditions, 7 rarity tiers, 42 achievement checks, 42 seeded achievements.` |
| `npm run check:catalog-drift` | PASS | `Catalog drift check passed locally: snapshot and seed match (82 items).` Remote comparison skipped without Supabase env vars |
| `npm run check:scoring-parity` | PASS | `Scoring parity passed for 5000 deterministic RGB samples.` |
| `npm run check:db-security` | PASS | `Database security and integrity checks passed.`; audit transaction rolled back |

No schema migration was added in Phase 9, so `supabase db lint` and
`npm run db:reset` were not rerun for this milestone; their Phase 8 results
remain green and are recorded in `docs/PROGRESS.md`.

## Phase 9 continuation

The opt-in product-event and operations-documentation slice is assessed in
[`docs/PHASE_9_ANALYTICS_REPORT.md`](PHASE_9_ANALYTICS_REPORT.md). It adds no
schema migration, durable event sink, moderation UI, notification system, or
change to scoring, economy, rewards, RLS, social records, or production data.
