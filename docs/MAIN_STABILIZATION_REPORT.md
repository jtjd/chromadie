# Main stabilization — September 8, 2026

Scope: main `8784bff5825de09e08fb1e698b8500d3a14b4f3c` and the user-supplied
seven-phase stabilization directive. Changes are local and unreleased.

## Verified remediation

- Correct keyed homepage collection iteration, Svelte-safe username pattern,
  and standard line-clamp compatibility declaration. Preserve the roll-first
  hero, chm specimen, canonical tilt, white Mythic sample, and inert social links.
  Shorten the community sentence that violated the existing homepage copy gate.
- Initialize V1/V2 configuration atomically on authoritative profile creation;
  backfill only missing rows. No synthetic writable frontend fallback.
- Reuse matching account identity for owner profile mounts and lazy Studio
  details. Cold complete owner context: **10 → 9 requests**, measured by the
  executable profile-request-budget test. Studio bootstrap: **1 → 1**.
  Public visitor identity never uses an owner record. Warm achievement reads
  already use the existing shared reference-data cache.
- Reload Studio on A→B→A account transitions, clear previous drafts on account
  changes, reject late publish/reset responses after logout/account changes,
  and invalidate pending profile/motion loads on unmount.
- Keep avatar orbit intersection state when a hidden tab becomes visible.
  Keep Name intersection, element size, and document visibility independent,
  preventing resize from restarting offscreen animation. Existing bounded DPR,
  reduced motion, animation-clock cleanup, cursor and atmosphere disposal remain.
- Restore mobile full-bleed/Sleek containment and reduced-motion link behavior.
- Update stale Studio/Leaderboard smoke expectations for Content/Rivals. Treat
  Progression's bounded horizontal tab scroller correctly and prove all four
  links remain keyboard-reachable. Add explicit anonymous visitor requests,
  mobile containment, owner-control absence, and compatibility canonicalization.

## Configuration lifecycle and security

Forward migration: `20260907120000_profile_configuration_initialization.sql`.
Its trigger has a fixed `pg_catalog` search path, schema-qualified calls, and
no browser/service direct execute grants. The existing primary key plus
`ON CONFLICT DO NOTHING` prevents duplicates. Existing drafts, expression,
publication timestamps, and historical data remain untouched.

Transactional local tests exercise auth insertion → get_my_profile → V2 read
→ first writable save; existing-account backfill; rerunning the actual migration
twice; preservation of complete preexisting configuration rows; and anonymous
execute denial. Both dev and production-build browser runs reached signup,
Studio hydration, and publish without provisioning configuration in the harness.
No production data, RLS, scoring, balance, catalog, or purchase authority changed.

## Build measurements

All values are kB as reported by the repository checker. Before is an isolated
worktree at `8784bff`, using the same installed dependencies and environment
files as after. The supplied historical numbers are a separate comparison.

| Surface | Historical JS / CSS | Current main before JS / CSS | After JS / CSS |
| --- | --- | --- | --- |
| Initial | 271.48 / 76.26 | 271.80 / 76.40 | 271.80 / 76.40 |
| Homepage | 461.13 / 164.69 | 486.04 / 178.74 | 486.15 / 178.75 |
| Public profile | 443.00 / 162.21 | 444.43 / 161.37 | 444.70 / 162.01 |
| Dashboard | 509.20 / 189.08 | 510.72 / 188.25 | 511.24 / 188.89 |
| Progression | 354.21 / 114.46 | 354.62 / 114.60 | 354.62 / 114.60 |
| Progression preview | 67.51 / 26.16 | 67.89 / 26.16 | 68.07 / 26.16 |

Largest lazy JS remains 76.31 kB; largest lazy CSS remains 62.78 kB.
Atmosphere catalog remains 85,913.13 kB; largest video 10,907.62 kB.
All enforced budgets pass without increases. Progression CSS has only 0.40 kB
headroom. The homepage's historical increase predates this remediation and
includes the intentional real renderer/effect specimen. The manifest checker
confirms public profiles do not statically include progression state or the
expression editor. Aggregate asset advisories remain above soft targets.

## Validation evidence

Command logs: `/tmp/chromadie-stabilization-validation`.

Passed: repository-wide ESLint and `npx eslint src/`; Svelte check (0 errors,
0 warnings); `npm test` (545 passed, 0 failed); dependency audit (0
vulnerabilities); profile certification; links; balance and catalog drift;
build; responsive build; enforced performance; CSP.

Passed local database gates: fresh `npm run db:reset`; schema lint with warnings
fatal; profile initialization; database security; profile insights; username
policy drift; progression database; owner surfaces database; scoring parity
(5,000 deterministic RGB samples).

Passed browser evidence:

- Homepage geometry: `artifacts/homepage-roll-first`.
- Homepage account hydration, token refresh, account switch, logout, guest
  restoration, public feed retry, desktop/mobile specimen:
  `artifacts/homepage-account-refinement`.
- Progression: `/tmp/chromadie-progression-smoke-COxkak/evidence.json`, all eight
  steps, including actual new-account roll, Content, Rivals, and reduced motion.
- Production build through local Pages Functions:
  `/tmp/chromadie-profile-studio-smoke-9t9vln/evidence.json`, including visitor
  canonical/compatibility routes and no private/owner requests.

Final development Studio passes all 18 steps:
`/tmp/chromadie-profile-studio-smoke-EqqkK3/evidence.json`. Both homepage
harnesses also pass after the Name visibility change. Production smoke uses
`PROFILE_STUDIO_SMOKE_SKIP_MEDIA=1`;
development smoke additionally uses `VITE_LOCAL_INTEGRATION_TEST=true`.
Hosted-media mutation is outside this remediation's browser evidence; no
Supabase Storage production fallback was added.

Earlier failures were retained in logs: Chromium `ERR_NETWORK_CHANGED`
interrupted lazy modules; stale Content/Rivals tab counts failed assertions;
and a compatibility-navigation helper waited for a URL that correctly
redirected. Timeouts were not increased. The explicit visitor test now waits
for the canonical destination and passes against the production build.

## Deliberate limits and external actions

The local Cloudflare release check fails closed for missing
`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and
`CLOUDFLARE_PAGES_PROJECT`. Configure those in the release environment.
The migration must be applied through the normal deployment process before
production new accounts receive the lifecycle fix. No deployment was performed.

Keep full authoritative return-to-tab refresh: profile privacy/publishing may
change in another tab. Existing in-flight refresh guards prevent overlapping
visibility/pageshow work. Keep shared achievement caching, lazy optional fonts
(including legacy readability), lazy Studio sections/preview, route promise
caching, initial URL parsing, focus/challenge/alias request guards, and dirty
navigation. No reproducible evidence justified replacing these mechanisms.

No speculative indexes, score recalculation, dependency churn, budget increases,
legacy Profile.svelte removal, CDN migration, CSP rewrite, editor fragmentation,
or unrelated visual redesign. No additional unreachable-code deletion was
justified beyond the repository's previous cleanup.
