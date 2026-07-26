# Chromadie 2.0 — Phase 9 Browser and Runtime Audit

**Audit date:** 2026-07-25  
**Branch:** `redesign/profile-first`  
**Scope:** direct refresh, metadata, keyboard access, reduced motion, mobile
layout, guest/authenticated critical flows, public profile safety, shop/privacy
states, and linked Supabase deployment readiness

## Baseline status

The local application is stable in the tested Chromium environment. The
browser audit found no local frontend runtime error or layout regression. The
linked Supabase project is not at the same schema/catalog boundary as the
current branch, so the deployed Phase 4–9 feature set is **NO-GO until the
remote drift is reviewed and an authorized migration deployment is completed**.

No database push, production data write, scoring/economy change, RLS change,
client fallback, or route redesign was performed during this audit.

## Test environment

- Local Vite server: `http://127.0.0.1:5174/` (the existing port 5173 process
  was left untouched).
- Chromium `150.0.7871.181`, desktop viewport `1440 × 1000`.
- Chromium mobile emulation, viewport `390 × 844`.
- `prefers-reduced-motion: reduce` was emulated for the mobile checks.
- Firefox `153.0` is installed, but headless automation could not complete
  because an existing Firefox process reported that it was already running and
  not responding. No Firefox pass is claimed.
- No Playwright or Puppeteer browser test dependency exists in the repository.

## Local browser evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Direct refresh shell | PASS | Vite returned 200 for `/`, `/privacy`, `/how-to-play`, `/leaderboard`, `/shop`, `/u/ExampleUser`, `/prototype/profile`, and an unknown path. Cloudflare Pages Function status/metadata contracts remain covered by source tests. |
| Route titles | PASS | Chromium resolved `Roll`, `Privacy Policy`, `How to Play`, `Discovery`, `Decoration Studio`, `ExampleUser`, and `Profile Canvas Prototype`. |
| Desktop layout | PASS | Tested routes rendered without horizontal overflow; no browser console/runtime errors were observed. |
| Mobile layout | PASS | At `390px`, `document.documentElement.scrollWidth` remained `390px`; the home and privacy surfaces remained usable. |
| Skip link and focus | PASS | Skip link received focus and targeted `#main-content`; route content focus was available without forced scrolling. |
| Mobile navigation | PASS | `aria-expanded` and `aria-hidden` changed with the menu; focus moved to the first mobile link and returned to the expected closed state after navigation. |
| Reduced motion | PASS | `matchMedia('(prefers-reduced-motion: reduce)')` matched and the skip-link transition resolved to approximately `0.000001s`. |
| Accessibility tree | PASS | Home, privacy, and discovery exposed navigation/main landmarks and an accessible skip link. Buttons had usable accessible names; privacy exposed `Allow product events` and `Keep off`. |
| Guest roll | PASS | Clicking the root roll in a clean browser session returned a canonical result, left the UI out of the rolling state, showed `Local Guest Score`, and persisted `chromadie-roll` locally. |
| Public profile error | PASS | A nonexistent `/u/ExampleUser` rendered the safe `PROFILE UNAVAILABLE` / `Player not found.` state with an alert region. |
| Signed-out shop | PASS | `/shop` rendered the account-required `Shop Locked` state without exposing owner controls. |
| Privacy preference | PASS | `/privacy` rendered the analytics preference controls and remained horizontally contained on mobile. |

The browser smoke covered the existing route and state contracts; it did not
create an authenticated test account or mutate remote account data.

## Linked remote checks

The configured linked Supabase project was queried read-only with the anon
key. Results:

| Surface | Result |
| --- | --- |
| `get_public_discovery` | HTTP 404, PostgREST `PGRST202` (function not found) |
| `get_public_profile_configuration` | HTTP 404, `PGRST202` |
| `get_public_profile_story` | HTTP 404, `PGRST202` |
| `get_public_profile_social` | HTTP 404, `PGRST202` |
| `get_my_profile_entitlements` | HTTP 404, `PGRST202` |
| `get_my_profile_configuration` | HTTP 404, `PGRST202` |
| `get_my_profile_social_settings` | HTTP 404, `PGRST202` |
| Existing `get_public_profile_scores` | HTTP 200 with an empty result for the probe id |
| `npm run check:catalog-drift` with linked credentials | FAIL: remote `shop_items` is missing `bg_prism_atmosphere` and `name_prism_atelier` |

`supabase migration list --linked` reports the remote history ending at
`20260712200000_launch_audit_remediation`, while the local Phase 4–8
migrations `20260725100000` through `20260725140000` are pending remotely.
The Chromium `/leaderboard` smoke correspondingly displayed
`Discovery could not be loaded. Please retry.` because its new discovery RPC
does not exist on the linked project.

The read-only `supabase db diff --linked --schema public` command completed but
reported schema drift, including warnings for drops involving the Phase 4–8
tables/functions/policies. Its generated diff was not applied or treated as a
rollback plan.

## Failures and boundaries

1. **Remote migration drift — launch blocker.** The current interactive client
   expects Phase 4–8 RPCs that are not present on the linked project. This is a
   deployment sequencing problem, not evidence that the client should fall
   back to older public queries.
2. **Remote catalog drift — launch blocker for catalog parity.** Two local
   catalog keys are absent remotely. The catalog must be reconciled through the
   reviewed server-side migration/seed boundary, not by adding client-only
   cosmetics.
3. **Firefox automation unavailable in this environment.** Existing Firefox
   process state prevented a clean headless run. A release browser matrix still
   needs a clean Firefox/WebKit or supported-device run before full Phase 9
   certification.
4. **Bundle warning remains.** `npm run check:performance` passes its current
   JavaScript/CSS/HTML budgets, but Vite still reports the existing large
   JavaScript chunk. Code-splitting is not part of this audit because no
   measured regression requires it yet.

## Coverage added

`test/phase-9-browser-audit.test.js` adds four focused contract tests for:

- wildcard direct-refresh routing, public profile status/robots/cache
  boundaries, and route parsing;
- skip-link, mobile-menu, reduced-motion, and privacy preference contracts;
- guest/authenticated roll seams, canonical result normalization, and
  owner/visitor profile separation;
- migration stop conditions and the rollback/recovery runbook.

The test is intentionally static/native because the repository has no browser
automation dependency. It protects the browser-observed assumptions without
introducing a test-only production service or remote data fixture.

## Recommended remediation

Before declaring this boundary launch-ready, an authorized release/DB owner
should:

1. Confirm the linked project and capture backup/point-in-time recovery
   ownership.
2. Review and apply the local Phase 4–8 migrations in order through the
   existing Supabase migration workflow.
3. Verify the remote migration list, all new RPCs, RLS/grants, and catalog rows;
   resolve the two catalog keys through the server source of truth.
4. Deploy matching Edge Functions and Pages assets.
5. Repeat the browser smoke with an authenticated owner account and a known
   public profile, including discovery, profile configuration/story/social,
   entitlements/shop access, guest roll, owner roll, direct refresh, metadata,
   and cache headers.
6. Run a clean Firefox/mobile-device pass and record the result.

The exact stop, rollback, and recovery boundaries are in
[`docs/ROLLBACK_AND_RECOVERY.md`](ROLLBACK_AND_RECOVERY.md). No migration push
was performed because that would be an external production-state change not
authorized by the audit request.

## Go/no-go assessment

**Local frontend browser audit: GO.** The tested Chromium critical flows and
accessibility/mobile contracts passed without product-behavior changes.

**Phase 9 launch certification: NO-GO.** Remote schema/catalog drift and the
uncompleted Firefox/device matrix leave the release boundary unverified. The
next action is authorized migration reconciliation and post-deploy smoke, not
a redesign or client fallback.
